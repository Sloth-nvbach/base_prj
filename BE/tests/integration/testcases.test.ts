// DSE-20: Thiết kế dữ liệu bộ kiểm thử và kết quả chấm
// DSE-21: Giảng viên thiết lập bộ kiểm thử cho bài tập
import { beforeEach, describe, expect, it } from 'vitest';
import { TestCaseModel, TestResultModel } from '../../src/models/testcase.model';
import { AssignmentModel } from '../../src/models/assignment.model';
import { SubmissionModel } from '../../src/models/submission.model';
import { api } from '../helpers/api';
import { bearerFor, createUser, teacher, student, admin } from '../helpers/user-factory';
import { Types } from 'mongoose';

const otherTeacher = () => createUser({ role: 'teacher' });

const createAssignment = (authorization: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/assignments')
    .set('Authorization', authorization)
    .send({ title: 'Loop exercises', ...body });

describe('DSE-20/21: TestCase CRUD', () => {
  let assignmentId: string;
  let teacherAuth: string;

  beforeEach(async () => {
    const user = await teacher();
    teacherAuth = bearerFor(user);
    const { body: assignment } = await createAssignment(teacherAuth);
    assignmentId = assignment._id;
  });

  it('creates a test case for an assignment', async () => {
    const response = await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({
        input: '1\n2\n',
        expectedOutput: '3\n',
        isHidden: false,
        order: 0,
        points: 10
      });

    expect(response.status).toBe(201);
    expect(response.body.assignmentId).toBe(assignmentId);
    expect(response.body.input).toBe('1\n2\n');
    expect(response.body.expectedOutput).toBe('3\n');
    expect(response.body.isHidden).toBe(false);
    expect(response.body.order).toBe(0);
    expect(response.body.points).toBe(10);
  });

  it('auto-assigns order if not provided', async () => {
    await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n', points: 10 });

    const response = await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '2\n', expectedOutput: '4\n', points: 10 });

    expect(response.body.order).toBe(1);
  });

  it('creates multiple test cases in bulk', async () => {
    const response = await api()
      .post(`/api/test-cases/assignment/${assignmentId}/bulk`)
      .set('Authorization', teacherAuth)
      .send([
        { input: '1\n', expectedOutput: '1\n', isHidden: false, points: 10 },
        { input: '2\n', expectedOutput: '2\n', isHidden: true, points: 20 },
        { input: '3\n', expectedOutput: '3\n', isHidden: false, points: 10 }
      ]);

    expect(response.status).toBe(201);
    expect(response.body.length).toBe(3);
    expect(response.body[0].order).toBe(0);
    expect(response.body[1].order).toBe(1);
    expect(response.body[2].order).toBe(2);
    expect(response.body[1].isHidden).toBe(true);
  });

  it('rejects invalid test case data', async () => {
    expect((
      await api()
        .post(`/api/test-cases/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ input: '', expectedOutput: '2\n' })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/test-cases/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ input: '1\n', expectedOutput: '' })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/test-cases/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ input: '1\n', expectedOutput: '2\n', points: 0 })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/test-cases/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ input: '1\n', expectedOutput: '2\n', points: 101 })
    ).status).toBe(400);
  });

  it('answers 404 for non-existent assignment', async () => {
    const response = await api()
      .post('/api/test-cases/assignment/507f1f77bcf86cd799439011')
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n' });
    expect(response.status).toBe(404);
  });

  it('answers 403 for students and 401 without token', async () => {
    expect((
      await api()
        .post(`/api/test-cases/assignment/${assignmentId}`)
        .set('Authorization', bearerFor(await student()))
        .send({ input: '1\n', expectedOutput: '2\n' })
    ).status).toBe(403);

    expect((
      await api()
        .post(`/api/test-cases/assignment/${assignmentId}`)
        .send({ input: '1\n', expectedOutput: '2\n' })
    ).status).toBe(401);
  });

  it('lists test cases with pagination and sorting', async () => {
    await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '1\n', expectedOutput: '2\n', order: 2 });
    await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '2\n', expectedOutput: '4\n', order: 0 });
    await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '3\n', expectedOutput: '6\n', order: 1, isHidden: true });

    const response = await api()
      .get(`/api/test-cases?assignmentId=${assignmentId}&sort=order`)
      .set('Authorization', teacherAuth);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(3);
    expect(response.body.items.map((tc: { order: number }) => tc.order)).toEqual([0, 1, 2]);
  });

  it('filters hidden test cases', async () => {
    await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '1\n', expectedOutput: '2\n', isHidden: false });
    await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '2\n', expectedOutput: '4\n', isHidden: true });

    const response = await api()
      .get(`/api/test-cases?assignmentId=${assignmentId}&isHidden=false`)
      .set('Authorization', teacherAuth);

    expect(response.body.total).toBe(1);
    expect(response.body.items[0].isHidden).toBe(false);
  });

  it('gets a single test case', async () => {
    const createResp = await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n' });

    const testCaseId = createResp.body._id;
    const response = await api().get(`/api/test-cases/${testCaseId}`).set('Authorization', teacherAuth);
    expect(response.status).toBe(200);
    expect(response.body._id).toBe(testCaseId);
  });

  it('updates a test case', async () => {
    const createResp = await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n', points: 10 });

    const testCaseId = createResp.body._id;
    const updateResp = await api()
      .patch(`/api/test-cases/${testCaseId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '2\n', expectedOutput: '4\n', points: 20 });

    expect(updateResp.status).toBe(200);
    expect(updateResp.body.input).toBe('2\n');
    expect(updateResp.body.points).toBe(20);
  });

  it('deletes a test case and reorders remaining', async () => {
    const r1 = await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '1\n', expectedOutput: '2\n', order: 0 });
    const r2 = await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '2\n', expectedOutput: '4\n', order: 1 });
    const r3 = await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '3\n', expectedOutput: '6\n', order: 2 });

    const deleteResp = await api().delete(`/api/test-cases/${r2.body._id}`).set('Authorization', teacherAuth);
    expect(deleteResp.status).toBe(204);

    const listResp = await api().get(`/api/test-cases?assignmentId=${assignmentId}&sort=order`).set('Authorization', teacherAuth);
    expect(listResp.body.total).toBe(2);
    expect(listResp.body.items.map((tc: { order: number }) => tc.order)).toEqual([0, 1]); // r3 shifted from 2 to 1
  });

  it("hides another teacher's test case behind 404", async () => {
    const alice = await teacher();
    const aliceAuth = bearerFor(alice);
    const aliceAssignment = await createAssignment(aliceAuth);
    const createResp = await api()
      .post(`/api/test-cases/assignment/${aliceAssignment.body._id}`)
      .set('Authorization', aliceAuth)
      .send({ input: '1\n', expectedOutput: '2\n' });

    const testCaseId = createResp.body._id;
    const bobAuth = bearerFor(await otherTeacher());

    expect((await api().patch(`/api/test-cases/${testCaseId}`).set('Authorization', bobAuth).send({ input: 'x\n' })).status).toBe(404);
    expect((await api().delete(`/api/test-cases/${testCaseId}`).set('Authorization', bobAuth)).status).toBe(404);
  });

  it('answers 403 when student tries to edit or delete', async () => {
    const createResp = await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n' });

    const testCaseId = createResp.body._id;
    const studentAuth = bearerFor(await student());

    expect((await api().patch(`/api/test-cases/${testCaseId}`).set('Authorization', studentAuth).send({ input: 'x\n' })).status).toBe(403);
    expect((await api().delete(`/api/test-cases/${testCaseId}`).set('Authorization', studentAuth)).status).toBe(403);
  });

  it('admin can manage any test case', async () => {
    const createResp = await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n' });

    const testCaseId = createResp.body._id;
    const adminAuth = bearerFor(await admin());

    const updateResp = await api().patch(`/api/test-cases/${testCaseId}`).set('Authorization', adminAuth).send({ input: 'updated\n' });
    expect(updateResp.status).toBe(200);

    const deleteResp = await api().delete(`/api/test-cases/${testCaseId}`).set('Authorization', adminAuth);
    expect(deleteResp.status).toBe(204);
  });

  it('reorders test cases', async () => {
    const r1 = await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '1\n', expectedOutput: '2\n' });
    const r2 = await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '2\n', expectedOutput: '4\n' });
    const r3 = await api().post(`/api/test-cases/assignment/${assignmentId}`).set('Authorization', teacherAuth).send({ input: '3\n', expectedOutput: '6\n' });

    const reorderResp = await api()
      .post(`/api/test-cases/assignment/${assignmentId}/reorder`)
      .set('Authorization', teacherAuth)
      .send({ testCaseIds: [r3.body._id, r1.body._id, r2.body._id] });

    expect(reorderResp.status).toBe(200);
    expect(reorderResp.body[0]._id).toBe(r3.body._id);
    expect(reorderResp.body[0].order).toBe(0);
    expect(reorderResp.body[1].order).toBe(1);
    expect(reorderResp.body[2].order).toBe(2);
  });
});

describe('DSE-20: TestResult read-only', () => {
  let assignmentId: string;
  let testCaseId: string;
  let submissionId: string;
  let teacherAuth: string;
  let studentAuth: string;

  beforeEach(async () => {
    const user = await teacher();
    teacherAuth = bearerFor(user);
    const studentUser = await student();
    studentAuth = bearerFor(studentUser);

    const { body: assignment } = await createAssignment(teacherAuth);
    assignmentId = assignment._id;

    const tc = await TestCaseModel.create({ assignmentId, input: '1\n', expectedOutput: '2\n', order: 0, points: 10 });
    testCaseId = tc._id.toString();

    const sub = await api()
      .post('/api/submissions')
      .set('Authorization', studentAuth)
      .send({ assignmentId, code: 'console.log(1);', language: 'javascript' });
    submissionId = sub.body._id;
  });

  it('lists test results', async () => {
    await TestResultModel.create({
      submissionId: new Types.ObjectId(submissionId), testCaseId: new Types.ObjectId(testCaseId), passed: true, stdout: '2\n', stderr: '', exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
    });

    const response = await api()
      .get(`/api/test-cases/results?submissionId=${submissionId}`)
      .set('Authorization', teacherAuth);

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].passed).toBe(true);
  });

  it('filters test results by passed status', async () => {
    await TestResultModel.create({
      submissionId: new Types.ObjectId(submissionId), testCaseId: new Types.ObjectId(testCaseId), passed: true, stdout: '2\n', stderr: '', exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
    });

    const response = await api()
      .get(`/api/test-cases/results?submissionId=${submissionId}&passed=false`)
      .set('Authorization', teacherAuth);

    expect(response.body.total).toBe(0);
  });

  it('gets a single test result', async () => {
    const result = await TestResultModel.create({
      submissionId: new Types.ObjectId(submissionId), testCaseId: new Types.ObjectId(testCaseId), passed: true, stdout: '2\n', stderr: '', exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
    });

    const response = await api()
      .get(`/api/test-cases/results/${result._id}`)
      .set('Authorization', teacherAuth);

    expect(response.status).toBe(200);
    expect(response.body._id).toBe(result._id.toString());
  });
});

describe('DSE-21: Students cannot see hidden test cases', () => {
  let assignmentId: string;
  let teacherAuth: string;

  beforeEach(async () => {
    const user = await teacher();
    teacherAuth = bearerFor(user);
    const { body: assignment } = await createAssignment(teacherAuth, { status: 'published' });
    assignmentId = assignment._id;

    await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '1\n', expectedOutput: '2\n', isHidden: false });

    await api()
      .post(`/api/test-cases/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ input: '2\n', expectedOutput: '4\n', isHidden: true });
  });

  it('student sees only non-hidden test cases for published assignment', async () => {
    const response = await api().get(`/api/test-cases?assignmentId=${assignmentId}`).set('Authorization', bearerFor(await student()));
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].isHidden).toBe(false);
  });
});