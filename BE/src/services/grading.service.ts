/**
 * Teacher grading workflow (DSE-24/25/26) and the submission views shared by
 * teachers and students (DSE-23/55).
 */
import type { Types } from 'mongoose';
import { AssignmentModel, type AssignmentDocument } from '../models/assignment.model';
import { RubricModel } from '../models/rubric.model';
import { SubmissionModel, type CriterionScore, type SubmissionDocument } from '../models/submission.model';
import { TestCaseModel } from '../models/testcase.model';
import { UserModel } from '../models/user.model';
import { badRequest, conflict, forbidden, notFound } from '../utils/app-error';
import { logger } from '../utils/logger';
import { paginate } from '../utils/pagination';
import type { GradeSubmissionInput, ReviewListQuery } from '../validators/submission.validator';
import { sendEmail } from './email.service';
import type { Actor } from './submission.service';

const isAdmin = (actor: Actor) => actor.role === 'admin';
const isStaff = (actor: Actor) => actor.role === 'teacher' || actor.role === 'admin';

/**
 * Total = Σ(score / maxScore × weight) / Σweight × assignment max score, rounded.
 * Dividing by Σweight keeps the result right even if weights drift from 100.
 */
export const computeRubricScore = (criteria: Pick<CriterionScore, 'score' | 'maxScore' | 'weight'>[], assignmentMax: number) => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  const ratio = criteria.reduce((sum, c) => sum + (c.score / c.maxScore) * c.weight, 0) / totalWeight;
  return Math.round(ratio * assignmentMax);
};

/** The submission plus its assignment, if the actor may grade it. Others get 404. */
const loadForStaff = async (actor: Actor, id: string) => {
  const submission = await SubmissionModel.findById(id);
  if (!submission) throw notFound('Submission not found');
  const assignment = await AssignmentModel.findById(submission.assignment);
  if (!assignment || (!isAdmin(actor) && assignment.createdBy.toString() !== actor.id)) {
    throw notFound('Submission not found');
  }
  return { submission, assignment };
};

const hiddenTestIds = async (assignmentIds: (string | Types.ObjectId)[]) =>
  new Set(
    (await TestCaseModel.find({ assignmentId: { $in: assignmentIds }, isHidden: true }).select('_id')).map((t) =>
      t._id.toString()
    )
  );

/**
 * What a student may see of their own submission: no AI suggestion, no grade
 * history, no draft grade before the teacher finalizes, and no output of hidden
 * test cases (their output would reveal the expected answer).
 */
export const toStudentView = (submission: SubmissionDocument, hidden: Set<string>) => {
  const view = submission.toJSON() as Record<string, unknown>;
  delete view.aiReview;
  delete view.gradeHistory;
  delete view.gradedBy;
  if (submission.status !== 'graded') {
    delete view.score;
    delete view.criterionScores;
    view.feedback = '';
  }
  view.testResults = ((view.testResults ?? []) as Record<string, unknown>[]).map((result) =>
    hidden.has(String(result.testCaseId)) ? { ...result, stdout: '', stderr: '', hidden: true } : { ...result, hidden: false }
  );
  return view;
};

/** Student views for a list of submissions (one query for hidden test ids). */
export const toStudentViews = async (submissions: SubmissionDocument[]) => {
  const assignmentIds = submissions.map((s) => (s.assignment as unknown as { _id?: Types.ObjectId })?._id ?? s.assignment);
  const hidden = await hiddenTestIds(assignmentIds);
  return submissions.map((s) => toStudentView(s, hidden));
};

/** DSE-38: submissions of the teacher's own assignments (admins: all). */
export const listForReview = async (actor: Actor, { assignment, status, ...pagination }: ReviewListQuery) => {
  const assignmentIds = await AssignmentModel.find({
    ...(isAdmin(actor) ? {} : { createdBy: actor.id }),
    ...(assignment ? { _id: assignment } : {})
  }).distinct('_id');
  const page = await paginate(
    SubmissionModel,
    { assignment: { $in: assignmentIds }, ...(status ? { status } : {}) },
    pagination
  );
  page.items = (await SubmissionModel.populate(page.items, [
    { path: 'assignment', select: 'title maxScore dueDate status' },
    { path: 'student', select: 'displayName email' }
  ])) as typeof page.items;
  return page;
};

/**
 * DSE-23/55: one submission with everything its page needs.
 * Staff get every test case (input + expected); students only visible ones.
 */
export const getSubmissionDetail = async (actor: Actor, id: string) => {
  let submission: SubmissionDocument;
  let assignment: AssignmentDocument;
  if (isStaff(actor)) {
    ({ submission, assignment } = await loadForStaff(actor, id));
  } else {
    const own = await SubmissionModel.findById(id);
    if (!own || own.student.toString() !== actor.id) throw notFound('Submission not found');
    const found = await AssignmentModel.findById(own.assignment);
    if (!found) throw notFound('Assignment not found');
    submission = own;
    assignment = found;
  }

  const [testCases, rubric, student] = await Promise.all([
    TestCaseModel.find({ assignmentId: assignment._id, ...(isStaff(actor) ? {} : { isHidden: false }) }).sort({ order: 1 }),
    RubricModel.findOne({ assignmentId: assignment._id }),
    UserModel.findById(submission.student).select('displayName email')
  ]);

  return {
    submission: isStaff(actor)
      ? submission.toJSON()
      : toStudentView(submission, await hiddenTestIds([assignment._id])),
    assignment: assignment.toJSON(),
    student: student?.toJSON() ?? null,
    testCases: testCases.map((t) => t.toJSON()),
    rubric: rubric?.toJSON() ?? null
  };
};

/**
 * DSE-24/25: save a draft grade. With a rubric, every criterion needs a score
 * (0..criterion max) and the total is computed; without one, `score` is given
 * directly (0..assignment max). Finalized grades are locked except for admins.
 */
export const gradeSubmission = async (actor: Actor, id: string, input: GradeSubmissionInput) => {
  const { submission, assignment } = await loadForStaff(actor, id);
  if (submission.status === 'graded' && !isAdmin(actor)) throw forbidden('Grade is finalized; only an admin can change it');

  const rubric = await RubricModel.findOne({ assignmentId: assignment._id });
  let criterionScores: CriterionScore[] = [];
  let score: number;

  if (rubric && rubric.criteria.length > 0) {
    const given = input.criterionScores;
    if (!given) throw badRequest('criterionScores is required: this assignment has a rubric');
    const known = new Set(rubric.criteria.map((c) => c._id.toString()));
    const unknown = Object.keys(given).find((key) => !known.has(key));
    if (unknown) throw badRequest(`Unknown criterion: ${unknown}`);

    criterionScores = rubric.criteria.map((c) => {
      const value = given[c._id.toString()];
      if (value === undefined) throw badRequest(`Missing score for "${c.name}"`);
      if (value > c.maxScore) throw badRequest(`Score for "${c.name}" must be at most ${c.maxScore}`);
      return { criterionId: c._id, name: c.name, score: value, maxScore: c.maxScore, weight: c.weight };
    });
    score = computeRubricScore(criterionScores, assignment.maxScore);
  } else {
    if (input.score === undefined) throw badRequest('score is required: this assignment has no rubric');
    if (input.score > assignment.maxScore) throw badRequest(`Score must be at most ${assignment.maxScore}`);
    score = input.score;
  }

  const feedback = input.feedback ?? submission.feedback;
  submission.set({ score, criterionScores, feedback });
  submission.gradeHistory.push({ score, criterionScores, feedback, by: actor.id as never, at: new Date(), final: false });
  await submission.save();
  return submission;
};

/** DSE-26: lock the saved grade, record who/when, and tell the student. */
export const finalizeSubmission = async (actor: Actor, id: string) => {
  const { submission, assignment } = await loadForStaff(actor, id);
  if (submission.status === 'graded') throw conflict('Grade is already finalized');
  if (submission.score === undefined || submission.score === null) throw badRequest('Save a grade before finalizing');

  const now = new Date();
  submission.set({ status: 'graded', gradedAt: now, gradedBy: actor.id });
  submission.gradeHistory.push({
    score: submission.score,
    criterionScores: submission.criterionScores,
    feedback: submission.feedback,
    by: actor.id as never,
    at: now,
    final: true
  });
  await submission.save();

  // A failed notification must not undo the grade.
  const student = await UserModel.findById(submission.student).select('email displayName');
  if (student) {
    await sendEmail(
      student.email,
      `Your submission for "${assignment.title}" was graded`,
      `<p>Your submission for <b>${escapeHtml(assignment.title)}</b> was graded: <b>${submission.score}/${assignment.maxScore}</b>.</p><p>Open Smart EdTech to see the feedback.</p>`
    ).catch((error: Error) => logger.error('Grade notification failed', { submissionId: id, error: error.message }));
  }
  return submission;
};

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
