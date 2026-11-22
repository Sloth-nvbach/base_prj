import { AssignmentModel } from '../models/assignment.model';
import { SubmissionModel } from '../models/submission.model';
import { TestCaseModel } from '../models/testcase.model';
import { forbidden, notFound, serviceUnavailable } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateSubmissionInput, ListSubmissionsQuery, RunSubmissionInput } from '../validators/submission.validator';
import { toStudentViews } from './grading.service';
import { getSubmissionRunQueueInstance } from './queue.service';
import type { RunJobData } from './queue.service';
import type { SandboxRunRequest } from './sandbox.service';

/** Who is making the request. Only students (role 'student') may submit. */
export interface Actor {
  id: string;
  role?: string;
}

const isStudent = (actor: Actor) => actor.role === 'student';

export type SubmissionAccess = { canSubmit: true } | { canSubmit: false; reason: string };

/**
 * DSE-19: the one place that decides whether a submission would be accepted
 * right now. Draft assignments answer 404 so their existence stays hidden;
 * every other refusal carries a reason. `POST /api/submissions` and
 * `GET /api/assignments/:id/submission-access` share this logic, so clients
 * cannot bypass it.
 */
const submissionAccess = async (actor: Actor, assignmentId: string): Promise<SubmissionAccess> => {
  const assignment = await AssignmentModel.findById(assignmentId);
  if (!assignment || assignment.status === 'draft') throw notFound('Assignment not found');
  if (!isStudent(actor)) return { canSubmit: false, reason: 'Only students can submit' };
  if (assignment.status === 'closed') return { canSubmit: false, reason: 'Assignment is closed for submissions' };
  if (assignment.dueDate && assignment.dueDate.getTime() < Date.now()) {
    return { canSubmit: false, reason: 'Deadline has passed' };
  }
  return { canSubmit: true };
};

/** Same rules as a submit attempt, but as an answer instead of an error. */
export const checkSubmissionAccess = (actor: Actor, assignmentId: string) => submissionAccess(actor, assignmentId);

export const createSubmission = async (actor: Actor, input: CreateSubmissionInput) => {
  const access = await submissionAccess(actor, input.assignment);
  if (!access.canSubmit) throw forbidden(access.reason);
  return SubmissionModel.create({ ...input, student: actor.id });
};

/**
 * The caller's own submissions only; other people's submissions answer nothing.
 * DSE-18: each history row carries the assignment's public fields (title,
 * status, maxScore, dueDate), so one call is enough to render the history.
 * A deleted assignment shows as null — the student's own record is kept.
 */
export const listSubmissions = async (actor: Actor, { assignment, ...pagination }: ListSubmissionsQuery) => {
  const page = await paginate(SubmissionModel, { student: actor.id, ...(assignment ? { assignment } : {}) }, pagination);
  const populated = await SubmissionModel.populate(page.items, {
    path: 'assignment',
    select: 'title status maxScore dueDate'
  });
  // Students never see AI suggestions, draft grades or hidden test output.
  return { ...page, items: await toStudentViews(populated) };
};

/**
 * Run a submission against test cases via the sandbox queue.
 * Returns a job ID that can be polled for results.
 * DSE-22: POST /api/submissions/:id/run
 */
export const runSubmission = async (actor: Actor, submissionId: string, input: RunSubmissionInput) => {
  // Verify submission exists and belongs to the actor
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) throw notFound('Submission not found');
  if (submission.student.toString() !== actor.id) throw notFound('Submission not found');

  // Verify assignment is published/closed (not draft) and has test cases
  const assignment = await AssignmentModel.findById(submission.assignment);
  if (!assignment || assignment.status === 'draft') throw notFound('Assignment not found');

  // Grade against all test cases. Hidden ones run too; only their input/expected output stay hidden from students.
  const testCases = await TestCaseModel.find({ assignmentId: assignment._id }).sort({ order: 1 });
  if (testCases.length === 0) throw notFound('No test cases available for this assignment');

  // Check if already graded/running
  if (submission.status === 'graded') {
    throw forbidden('Submission already graded');
  }

  // Prepare test cases for sandbox
  const sandboxTestCases = testCases.map((tc) => ({
    input: tc.input,
    expectedOutput: tc.expectedOutput
  }));
  const testCaseIds = testCases.map((tc) => tc._id.toString());

  // Map submission language to sandbox language (TypeScript -> JavaScript)
  const sandboxLanguageMap: Record<string, SandboxRunRequest['language']> = {
    javascript: 'javascript',
    typescript: 'typescript', // Node strips the types (sandbox/runner.mjs)
    python: 'python',
    java: 'java',
    cpp: 'cpp',
    c: 'c'
  };
  const sandboxLanguage = sandboxLanguageMap[submission.language] || 'javascript';

  // Add job to queue
  const queue = getSubmissionRunQueueInstance();
  try {
    const { jobId } = await queue.addJob({
      submissionId,
      userId: actor.id,
      code: submission.code,
      language: sandboxLanguage,
      testCases: sandboxTestCases,
      testCaseIds
    });
    return { jobId, message: 'Submission queued for execution' };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Max concurrent runs')) {
      throw forbidden(error.message);
    }
    throw error;
  }
};

/**
 * Get the result of a submission run job.
 * DSE-22: GET /api/submissions/:id/run-result
 */
export const getSubmissionRunResult = async (actor: Actor, submissionId: string, jobId: string) => {
  // Verify submission exists and belongs to the actor
  const submission = await SubmissionModel.findById(submissionId);
  if (!submission) throw notFound('Submission not found');
  if (submission.student.toString() !== actor.id) throw notFound('Submission not found');

  // Get job status
  const queue = getSubmissionRunQueueInstance();
  const job = await queue.getJob(jobId);

  if (!job) throw notFound('Job not found');
  if (job.data.submissionId !== submissionId) throw notFound('Job not found for this submission');

  // Only the summary of the raw sandbox result: per-test output of hidden cases must not reach students.
  const [view] = await toStudentViews([submission]);
  const sandbox = job.result?.sandboxResponse;
  return {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    result: job.result ? { success: job.result.success, status: sandbox?.status, summary: sandbox?.summary, error: job.result.error } : undefined,
    error: job.error,
    submission: {
      status: view.status,
      runStatus: view.runStatus,
      runMessage: view.runMessage,
      totalScore: view.totalScore,
      maxScore: view.maxScore,
      testResults: view.testResults,
      gradedAt: view.gradedAt,
      feedback: view.feedback
    }
  };
};
