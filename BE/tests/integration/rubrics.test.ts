// DSE-51: Rubric Data Model & CRUD
// DSE-52: Teacher defines Rubric per Exercise
import { beforeEach, describe, expect, it } from 'vitest';
import { RubricModel } from '../../src/models/rubric.model';
import { AssignmentModel } from '../../src/models/assignment.model';
import { api } from '../helpers/api';
import { bearerFor, createUser, teacher, student, admin } from '../helpers/user-factory';

const otherTeacher = () => createUser({ role: 'teacher' });

const createAssignment = (authorization: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/assignments')
    .set('Authorization', authorization)
    .send({ title: 'Loop exercises', ...body });

describe('DSE-51: Rubric CRUD', () => {
  let assignmentId: string;
  let teacherAuth: string;

  beforeEach(async () => {
    const user = await teacher();
    teacherAuth = bearerFor(user);
    const { body: assignment } = await createAssignment(teacherAuth);
    assignmentId = assignment._id;
  });

  it('creates a rubric for an assignment', async () => {
    const response = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({
        criteria: [
          { name: 'Correctness', description: 'Code works correctly', weight: 50, maxScore: 100, order: 0 },
          { name: 'Style', description: 'Code follows style guide', weight: 30, maxScore: 100, order: 1 },
          { name: 'Efficiency', description: 'Code is efficient', weight: 20, maxScore: 100, order: 2 }
        ]
      });

    expect(response.status).toBe(201);
    expect(response.body.assignmentId).toBe(assignmentId);
    expect(response.body.criteria.length).toBe(3);
    expect(response.body.criteria[0].name).toBe('Correctness');
    expect(response.body.criteria[0].weight).toBe(50);
  });

  it('auto-normalizes weights to sum to 100', async () => {
    const response = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({
        criteria: [
          { name: 'A', weight: 40, maxScore: 100, order: 0 },
          { name: 'B', weight: 30, maxScore: 100, order: 1 },
          { name: 'C', weight: 20, maxScore: 100, order: 2 }
        ]
      });

    expect(response.status).toBe(201);
    const totalWeight = response.body.criteria.reduce((sum: number, c: { weight: number }) => sum + c.weight, 0);
    expect(totalWeight).toBe(100);
  });

  it('rejects duplicate criterion names', async () => {
    const response = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({
        criteria: [
          { name: 'Correctness', weight: 50, maxScore: 100, order: 0 },
          { name: 'correctness', weight: 30, maxScore: 100, order: 1 }, // case-insensitive duplicate
          { name: 'Efficiency', weight: 20, maxScore: 100, order: 2 }
        ]
      });

    expect(response.status).toBe(400);
  });

  it('rejects criteria with all zero weights', async () => {
    const response = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({
        criteria: [
          { name: 'A', weight: 0, maxScore: 100, order: 0 },
          { name: 'B', weight: 0, maxScore: 100, order: 1 }
        ]
      });

    expect(response.status).toBe(400);
  });

  it('rejects invalid criterion data', async () => {
    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ criteria: [{ name: '', weight: 100, maxScore: 100, order: 0 }] })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ criteria: [{ name: 'Test', weight: -1, maxScore: 100, order: 0 }] })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ criteria: [{ name: 'Test', weight: 101, maxScore: 100, order: 0 }] })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ criteria: [{ name: 'Test', weight: 50, maxScore: 0, order: 0 }] })
    ).status).toBe(400);

    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .set('Authorization', teacherAuth)
        .send({ criteria: [{ name: 'Test', weight: 50, maxScore: 101, order: 0 }] })
    ).status).toBe(400);
  });

  it('answers 404 for non-existent assignment', async () => {
    const response = await api()
      .post('/api/rubrics/assignment/507f1f77bcf86cd799439011')
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });
    expect(response.status).toBe(404);
  });

  it('answers 403 for students and 401 without token', async () => {
    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .set('Authorization', bearerFor(await student()))
        .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] })
    ).status).toBe(403);

    expect((
      await api()
        .post(`/api/rubrics/assignment/${assignmentId}`)
        .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] })
    ).status).toBe(401);
  });

  it('gets rubric by assignmentId', async () => {
    await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });

    const response = await api().get(`/api/rubrics/assignment/${assignmentId}`).set('Authorization', teacherAuth);
    expect(response.status).toBe(200);
    expect(response.body.assignmentId).toBe(assignmentId);
    expect(response.body.criteria.length).toBe(1);
  });

  it('returns empty rubric structure when none exists', async () => {
    const response = await api().get(`/api/rubrics/assignment/${assignmentId}`).set('Authorization', teacherAuth);
    expect(response.status).toBe(200);
    expect(response.body.assignmentId).toBe(assignmentId);
    expect(response.body.criteria).toEqual([]);
  });

  it('updates rubric', async () => {
    const createResp = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Original', weight: 100, maxScore: 100, order: 0 }] });

    const rubricId = createResp.body._id;
    const updateResp = await api()
      .patch(`/api/rubrics/${rubricId}`)
      .set('Authorization', teacherAuth)
      .send({
        criteria: [
          { name: 'Updated', weight: 60, maxScore: 100, order: 0 },
          { name: 'New Criterion', weight: 40, maxScore: 100, order: 1 }
        ]
      });

    expect(updateResp.status).toBe(200);
    expect(updateResp.body.criteria.length).toBe(2);
    expect(updateResp.body.criteria[0].name).toBe('Updated');
  });

  it('deletes rubric', async () => {
    const createResp = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });

    const rubricId = createResp.body._id;
    const deleteResp = await api().delete(`/api/rubrics/${rubricId}`).set('Authorization', teacherAuth);
    expect(deleteResp.status).toBe(204);

    const getResp = await api().get(`/api/rubrics/${rubricId}`).set('Authorization', teacherAuth);
    expect(getResp.status).toBe(404);
  });

  it("hides another teacher's rubric behind 404", async () => {
    const alice = await teacher();
    const aliceAuth = bearerFor(alice);
    const aliceAssignment = await createAssignment(aliceAuth);
    const createResp = await api()
      .post(`/api/rubrics/assignment/${aliceAssignment.body._id}`)
      .set('Authorization', aliceAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });

    const rubricId = createResp.body._id;
    const bobAuth = bearerFor(await otherTeacher());

    expect((await api().patch(`/api/rubrics/${rubricId}`).set('Authorization', bobAuth).send({ criteria: [{ name: 'x', weight: 100, maxScore: 100, order: 0 }] })).status).toBe(404);
    expect((await api().delete(`/api/rubrics/${rubricId}`).set('Authorization', bobAuth)).status).toBe(404);
  });

  it('answers 403 when student tries to edit or delete', async () => {
    const createResp = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });

    const rubricId = createResp.body._id;
    const studentAuth = bearerFor(await student());

    expect((await api().patch(`/api/rubrics/${rubricId}`).set('Authorization', studentAuth).send({ criteria: [{ name: 'x', weight: 100, maxScore: 100, order: 0 }] })).status).toBe(403);
    expect((await api().delete(`/api/rubrics/${rubricId}`).set('Authorization', studentAuth)).status).toBe(403);
  });

  it('admin can manage any rubric', async () => {
    const createResp = await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });

    const rubricId = createResp.body._id;
    const adminAuth = bearerFor(await admin());

    const updateResp = await api()
      .patch(`/api/rubrics/${rubricId}`)
      .set('Authorization', adminAuth)
      .send({ criteria: [{ name: 'Admin Updated', weight: 100, maxScore: 100, order: 0 }] });
    expect(updateResp.status).toBe(200);

    const deleteResp = await api().delete(`/api/rubrics/${rubricId}`).set('Authorization', adminAuth);
    expect(deleteResp.status).toBe(204);
  });

  it('gets default rubric template', async () => {
    const response = await api().get('/api/rubrics/default').set('Authorization', teacherAuth);
    expect(response.status).toBe(200);
    expect(response.body.criteria.length).toBe(4);
    expect(response.body.criteria.map((c: { name: string }) => c.name)).toEqual(['Correctness', 'Code Quality', 'Efficiency', 'Documentation']);
    const totalWeight = response.body.criteria.reduce((sum: number, c: { weight: number }) => sum + c.weight, 0);
    expect(totalWeight).toBe(100);
  });
});

describe('DSE-52: Students read rubric for published assignments', () => {
  let assignmentId: string;
  let teacherAuth: string;

  beforeEach(async () => {
    const user = await teacher();
    teacherAuth = bearerFor(user);
    const { body: assignment } = await createAssignment(teacherAuth, { status: 'published' });
    assignmentId = assignment._id;

    await api()
      .post(`/api/rubrics/assignment/${assignmentId}`)
      .set('Authorization', teacherAuth)
      .send({ criteria: [{ name: 'Correctness', weight: 50, maxScore: 100, order: 0 }] });
  });

  it('student can read rubric for published assignment', async () => {
    const response = await api().get(`/api/rubrics/assignment/${assignmentId}`).set('Authorization', bearerFor(await student()));
    expect(response.status).toBe(200);
    expect(response.body.criteria.length).toBe(1);
  });

  it('student cannot read rubric for draft assignment', async () => {
    const user = await teacher();
    const draftAuth = bearerFor(user);
    const { body: draftAssignment } = await createAssignment(draftAuth);
    await api()
      .post(`/api/rubrics/assignment/${draftAssignment._id}`)
      .set('Authorization', draftAuth)
      .send({ criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }] });

    const response = await api().get(`/api/rubrics/assignment/${draftAssignment._id}`).set('Authorization', bearerFor(await student()));
    expect(response.status).toBe(404);
  });
});