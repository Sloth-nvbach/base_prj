// DSE-22: Submission run against test cases via sandbox queue
import { describe, expect, it, beforeEach } from 'vitest';
import { SubmissionModel } from '../../src/models/submission.model';
import { TestCaseModel } from '../../src/models/testcase.model';
import { AssignmentModel } from '../../src/models/assignment.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';
import { resetSubmissionRunQueueInstance } from '../../src/services/queue.service';
import { sandboxMock } from '../setup/mock-external-services';
import { env } from '../../src/config/env';

let sequence = 0;
const uniqueEmail = (prefix: string) => `${prefix}${(sequence += 1)}@example.com`;

const teacher = () => createUser({ email: uniqueEmail('teacher'), role: 'teacher' });
const student = () => createUser({ email: uniqueEmail('student'), role: 'student' });

/** Create a teacher user and return their auth token. */
const createTeacherAuth = async () => {
  const user = await teacher();
  return { user, auth: bearerFor(user) };
};

const createAssignment = async (teacherAuth: string, body: Record<string, unknown> = {}) => {
  const { body: created } = await api()
    .post('/api/assignments')
    .set('Authorization', teacherAuth)
    .send({ title: 'Loop exercises', status: 'published', ...body });
  return created;
};

const createTestCases = async (teacherAuth: string, assignmentId: string, cases: Array<{ input: string; expectedOutput: string; points?: number; isHidden?: boolean }>) => {
  const testCases = cases.map((c, i) => ({
    input: c.input,
    expectedOutput: c.expectedOutput,
    points: c.points ?? 10,
    isHidden: c.isHidden ?? false,
    order: i
  }));
  const { body } = await api()
    .post(`/api/test-cases/assignment/${assignmentId}/bulk`)
    .set('Authorization', teacherAuth)
    .send(testCases);
  return body;
};

const submit = (authorization: string, assignmentId: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/submissions')
    .set('Authorization', authorization)
    .send({ assignment: assignmentId, code: 'console.log("hi");', ...body });

const runSubmission = (authorization: string, submissionId: string) =>
  api()
    .post(`/api/submissions/${submissionId}/run`)
    .set('Authorization', authorization)
    .send({});

const getRunResult = (authorization: string, submissionId: string, jobId: string) =>
  api()
    .get(`/api/submissions/${submissionId}/run-result`)
    .set('Authorization', authorization)
    .query({ jobId });

/** Generate a valid MongoDB ObjectId for testing. */
const generateObjectId = () => '507f1f77bcf86cd799439011'.slice(0, -1) + Math.floor(Math.random() * 10).toString();

describe('DSE-22: Submission run via sandbox', () => {
  beforeEach(async () => {
    sandboxMock.clear();
    resetSubmissionRunQueueInstance();
    await SubmissionModel.deleteMany({});
    await TestCaseModel.deleteMany({});
    await AssignmentModel.deleteMany({});
  });

  it('queues a submission for execution and returns jobId', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [
      { input: '1\n2\n', expectedOutput: '3\n' },
      { input: '5\n5\n', expectedOutput: '10\n' }
    ]);

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id, { code: 'const a=1,b=2;console.log(a+b);' });

    const runResponse = await runSubmission(auth, submission._id);
    expect(runResponse.status).toBe(202);
    expect(runResponse.body).toHaveProperty('jobId');
    expect(runResponse.body.message).toBe('Submission queued for execution');
  });

  it('grades hidden test cases too (an assignment with only hidden cases can run)', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '10 20', expectedOutput: '30', isHidden: true }]);

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id);

    const runResponse = await runSubmission(auth, submission._id);
    expect(runResponse.status).toBe(202);
  });

  it('rejects run for submission without test cases', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth); // No test cases

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id);

    const runResponse = await runSubmission(auth, submission._id);
    expect(runResponse.status).toBe(404);
    expect(runResponse.body.message).toBe('No test cases available for this assignment');
  });

  it('rejects run for draft assignment (assignment not found)', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    // Create assignment as published first, then change to draft
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id);

    // Change assignment to draft
    await AssignmentModel.findByIdAndUpdate(assignment._id, { status: 'draft' });

    // Now try to run - should fail with 404 (assignment not found / draft)
    const runResponse = await runSubmission(auth, submission._id);
    expect(runResponse.status).toBe(404);
  });

  it('rejects run for already graded submission', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id);

    // Manually mark as graded
    await SubmissionModel.findByIdAndUpdate(submission._id, { status: 'graded', gradedAt: new Date() });

    const runResponse = await runSubmission(auth, submission._id);
    expect(runResponse.status).toBe(403);
    expect(runResponse.body.message).toBe('Submission already graded');
  });

  it('rejects run for another user\'s submission', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth1 = bearerFor(await student());
    const { body: submission } = await submit(auth1, assignment._id);

    const auth2 = bearerFor(await student());
    const runResponse = await runSubmission(auth2, submission._id);
    expect(runResponse.status).toBe(404);
  });

  it('returns job status when polling run-result', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id);

    const runResponse = await runSubmission(auth, submission._id);
    const jobId = runResponse.body.jobId;

    // Poll immediately - job will be in waiting state
    const resultResponse = await getRunResult(auth, submission._id, jobId);
    expect(resultResponse.status).toBe(200);
    expect(resultResponse.body).toHaveProperty('jobId', jobId);
    expect(resultResponse.body).toHaveProperty('status');
    expect(['waiting', 'active', 'completed', 'failed']).toContain(resultResponse.body.status);
    expect(resultResponse.body).toHaveProperty('submission');
  });

  it('rejects polling with invalid jobId', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth = bearerFor(await student());
    const { body: submission } = await submit(auth, assignment._id);

    const fakeJobId = generateObjectId();
    const resultResponse = await getRunResult(auth, submission._id, fakeJobId);
    expect(resultResponse.status).toBe(404);
    expect(resultResponse.body.message).toBe('Job not found');
  });

  it('rejects polling for another user\'s job', async () => {
    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth1 = bearerFor(await student());
    const { body: submission } = await submit(auth1, assignment._id);
    const runResponse = await runSubmission(auth1, submission._id);
    const jobId = runResponse.body.jobId;

    const auth2 = bearerFor(await student());
    const resultResponse = await getRunResult(auth2, submission._id, jobId);
    expect(resultResponse.status).toBe(404);
  });

  it('enforces max concurrent runs per user (service level test)', async () => {
    // Test the queue service directly to avoid env caching issues
    const { getSubmissionRunQueueInstance, resetSubmissionRunQueueInstance } = await import('../../src/services/queue.service');
    
    resetSubmissionRunQueueInstance();
    const queue = getSubmissionRunQueueInstance();
    
    // Manually set max concurrent to 1 for this test
    (queue as any).maxConcurrentPerUser = 1;

    const { auth: teacherAuth } = await createTeacherAuth();
    const assignment = await createAssignment(teacherAuth);
    await createTestCases(teacherAuth, assignment._id, [{ input: '1', expectedOutput: '1' }]);

    const auth = bearerFor(await student());
    const { body: submission1 } = await submit(auth, assignment._id);
    const { body: submission2 } = await submit(auth, assignment._id);

    // First run should succeed
    const run1 = await runSubmission(auth, submission1._id);
    expect(run1.status).toBe(202);

    // Second run should fail (max 1 concurrent) - returns 403 Forbidden
    const run2 = await runSubmission(auth, submission2._id);
    expect(run2.status).toBe(403);
    expect(run2.body.message).toContain('Max concurrent runs');

    // Reset
    (queue as any).maxConcurrentPerUser = env.maxConcurrentRunsPerUser;
    resetSubmissionRunQueueInstance();
  });

  it('returns 503 when sandbox not configured (service level test)', async () => {
    // Test the sandbox service directly
    const { runCodeInSandbox } = await import('../../src/services/sandbox.service');
    const { serviceUnavailable } = await import('../../src/utils/app-error');

    // Temporarily unset sandbox URL
    const originalUrl = env.sandboxApiUrl;
    (env as any).sandboxApiUrl = undefined;

    try {
      await runCodeInSandbox({
        code: 'console.log(1);',
        language: 'javascript',
        testCases: [{ input: '', expectedOutput: '' }]
      });
      throw new Error('Should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(serviceUnavailable('').constructor);
      expect((error as Error).message).toContain('Sandbox runner not configured');
    }

    // Restore
    (env as any).sandboxApiUrl = originalUrl;
  });
});