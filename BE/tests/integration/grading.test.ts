// DSE-23/24/25/26/38: teacher grading workflow and the student view of a submission.
import { describe, expect, it } from 'vitest';
import { SubmissionModel } from '../../src/models/submission.model';
import { TestCaseModel } from '../../src/models/testcase.model';
import { computeRubricScore } from '../../src/services/grading.service';
import { api } from '../helpers/api';
import { emailOutbox } from '../helpers/email-outbox';
import { admin, bearerFor, student, teacher } from '../helpers/user-factory';

const setup = async ({ withRubric = true } = {}) => {
  const owner = await teacher();
  const teacherAuth = bearerFor(owner);
  const { body: assignment } = await api()
    .post('/api/assignments')
    .set('Authorization', teacherAuth)
    .send({ title: 'Sum', status: 'published', maxScore: 10 });

  let criteria: { _id: string; name: string }[] = [];
  if (withRubric) {
    const { body: rubric } = await api()
      .post(`/api/rubrics/assignment/${assignment._id}`)
      .set('Authorization', teacherAuth)
      .send({
        criteria: [
          { name: 'Correctness', weight: 60, maxScore: 10 },
          { name: 'Style', weight: 40, maxScore: 5 }
        ]
      });
    criteria = rubric.criteria;
  }

  const [visible, hidden] = await TestCaseModel.create([
    { assignmentId: assignment._id, input: '1 2', expectedOutput: '3', isHidden: false, points: 1, order: 0 },
    { assignmentId: assignment._id, input: '10 20', expectedOutput: '30', isHidden: true, points: 1, order: 1 }
  ]);

  const learner = await student();
  const studentAuth = bearerFor(learner);
  const { body: created } = await api()
    .post('/api/submissions')
    .set('Authorization', studentAuth)
    .send({ assignment: assignment._id, code: 'print(1)', language: 'python' });

  // What the worker stores after a sandbox run, plus an AI suggestion for the teacher.
  await SubmissionModel.findByIdAndUpdate(created._id, {
    runStatus: 'completed',
    testResults: [
      { testCaseId: visible._id, passed: true, stdout: '3\n', stderr: '', exitCode: 0, executionTimeMs: 5, memoryUsedMB: 0, points: 1 },
      { testCaseId: hidden._id, passed: true, stdout: '30\n', stderr: '', exitCode: 0, executionTimeMs: 5, memoryUsedMB: 0, points: 1 }
    ],
    aiReview: { summary: 'secret suggestion' }
  });

  const byName = (name: string) => criteria.find((c) => c.name === name)!._id;
  return { assignment, teacherAuth, studentAuth, learner, submissionId: created._id as string, byName };
};

const grade = (auth: string, id: string, body: object) =>
  api().post(`/api/submissions/${id}/grade`).set('Authorization', auth).send(body);
const finalize = (auth: string, id: string) =>
  api().post(`/api/submissions/${id}/finalize`).set('Authorization', auth).send();
const detail = (auth: string, id: string) => api().get(`/api/submissions/${id}`).set('Authorization', auth);

describe('computeRubricScore', () => {
  it('weights each criterion and scales to the assignment max', () => {
    expect(computeRubricScore([{ score: 10, maxScore: 10, weight: 60 }, { score: 0, maxScore: 5, weight: 40 }], 10)).toBe(6);
    expect(computeRubricScore([{ score: 5, maxScore: 10, weight: 60 }, { score: 5, maxScore: 5, weight: 40 }], 100)).toBe(70);
    expect(computeRubricScore([], 10)).toBe(0);
  });
});

describe('grading workflow', () => {
  it('lists submissions of the teacher\'s own assignments only', async () => {
    const { teacherAuth, submissionId } = await setup();
    const own = await api().get('/api/submissions/review').set('Authorization', teacherAuth);
    expect(own.status).toBe(200);
    expect(own.body.items.map((s: { _id: string }) => s._id)).toEqual([submissionId]);
    expect(own.body.items[0].student).toMatchObject({ email: expect.any(String) });
    expect(own.body.items[0].student.password).toBeUndefined();
    expect(own.body.items[0].assignment).toMatchObject({ title: 'Sum' });

    const other = await api().get('/api/submissions/review').set('Authorization', bearerFor(await teacher()));
    expect(other.body.items).toEqual([]);
    expect((await api().get('/api/submissions/review').set('Authorization', bearerFor(await admin()))).body.total).toBe(1);
  });

  it('rejects students from the review list and grading', async () => {
    const { studentAuth, submissionId } = await setup();
    expect((await api().get('/api/submissions/review').set('Authorization', studentAuth)).status).toBe(403);
    expect((await grade(studentAuth, submissionId, { score: 1 })).status).toBe(403);
  });

  it('gives teachers the full detail, hides others\' submissions', async () => {
    const { teacherAuth, submissionId } = await setup();
    const res = await detail(teacherAuth, submissionId);
    expect(res.status).toBe(200);
    expect(res.body.testCases).toHaveLength(2);
    expect(res.body.rubric.criteria).toHaveLength(2);
    expect(res.body.submission.aiReview).toEqual({ summary: 'secret suggestion' });
    expect(res.body.submission.testResults[1].stdout).toBe('30\n');
    expect((await detail(bearerFor(await teacher()), submissionId)).status).toBe(404);
  });

  it('computes the rubric score, validates scores and keeps a history', async () => {
    const { teacherAuth, submissionId, byName } = await setup();
    const correctness = byName('Correctness');
    const style = byName('Style');

    expect((await grade(teacherAuth, submissionId, { score: 5 })).status).toBe(400);
    expect((await grade(teacherAuth, submissionId, { criterionScores: { [correctness]: 10 } })).body.message).toBe('Missing score for "Style"');
    expect((await grade(teacherAuth, submissionId, { criterionScores: { [correctness]: 11, [style]: 1 } })).status).toBe(400);
    expect((await grade(teacherAuth, submissionId, { criterionScores: { [correctness]: -1, [style]: 1 } })).status).toBe(400);
    expect((await grade(teacherAuth, submissionId, { criterionScores: { [correctness]: 1, [style]: 1, ['a'.repeat(24)]: 1 } })).status).toBe(400);

    const saved = await grade(teacherAuth, submissionId, { criterionScores: { [correctness]: 10, [style]: 0 }, feedback: 'Good start' });
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ score: 6, status: 'submitted', feedback: 'Good start' });
    expect(saved.body.criterionScores).toHaveLength(2);
    expect(saved.body.gradeHistory).toHaveLength(1);
    expect(saved.body.gradeHistory[0]).toMatchObject({ score: 6, final: false });
  });

  it('accepts a plain score when there is no rubric, up to the assignment max', async () => {
    const { teacherAuth, submissionId } = await setup({ withRubric: false });
    expect((await grade(teacherAuth, submissionId, { score: 11 })).status).toBe(400);
    expect((await grade(teacherAuth, submissionId, { score: 8 })).body.score).toBe(8);
  });

  it('finalizes once, locks the grade for teachers, notifies the student, lets admins override', async () => {
    const { teacherAuth, submissionId, learner } = await setup({ withRubric: false });
    expect((await finalize(teacherAuth, submissionId)).status).toBe(400); // nothing saved yet

    await grade(teacherAuth, submissionId, { score: 7, feedback: 'Nice' });
    const done = await finalize(teacherAuth, submissionId);
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ status: 'graded', score: 7, gradedBy: expect.any(String), gradedAt: expect.any(String) });
    expect(done.body.gradeHistory.at(-1)).toMatchObject({ final: true, score: 7 });
    expect(emailOutbox.find((mail) => mail.to === learner.email)?.subject).toContain('graded');

    expect((await finalize(teacherAuth, submissionId)).status).toBe(409);
    expect((await grade(teacherAuth, submissionId, { score: 1 })).status).toBe(403);
    const override = await grade(bearerFor(await admin()), submissionId, { score: 9 });
    expect(override.status).toBe(200);
    expect(override.body).toMatchObject({ score: 9, status: 'graded' });
  });
});

describe('student view', () => {
  it('hides hidden test output, AI suggestion and draft grades until finalized', async () => {
    const { teacherAuth, studentAuth, submissionId } = await setup({ withRubric: false });
    await grade(teacherAuth, submissionId, { score: 4, feedback: 'Draft note' });

    const draft = await detail(studentAuth, submissionId);
    expect(draft.status).toBe(200);
    expect(draft.body.testCases).toHaveLength(1); // only the visible case
    const [visibleResult, hiddenResult] = draft.body.submission.testResults;
    expect(visibleResult).toMatchObject({ stdout: '3\n', hidden: false });
    expect(hiddenResult).toMatchObject({ stdout: '', hidden: true, passed: true });
    expect(draft.body.submission.aiReview).toBeUndefined();
    expect(draft.body.submission.gradeHistory).toBeUndefined();
    expect(draft.body.submission.score).toBeUndefined();
    expect(draft.body.submission.feedback).toBe('');

    const list = await api().get('/api/submissions').set('Authorization', studentAuth);
    expect(list.body.items[0].aiReview).toBeUndefined();
    expect(list.body.items[0].testResults[1]).toMatchObject({ stdout: '', hidden: true });

    await finalize(teacherAuth, submissionId);
    const graded = await detail(studentAuth, submissionId);
    expect(graded.body.submission).toMatchObject({ score: 4, feedback: 'Draft note', status: 'graded' });
  });

  it('answers 404 for another student\'s submission', async () => {
    const { submissionId } = await setup();
    expect((await detail(bearerFor(await student()), submissionId)).status).toBe(404);
  });
});
