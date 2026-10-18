// DSE-14: teachers create and edit their assignments. DSE-16: students read
// the published ones. Follows the notes tests: real app over HTTP, in-memory MongoDB.
import { describe, expect, it } from 'vitest';
import { AssignmentModel } from '../../src/models/assignment.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

const teacher = () => createUser({ email: 'teacher@example.com', role: 'teacher' });
const otherTeacher = () => createUser({ email: 'teacher2@example.com', role: 'teacher' });
const student = () => createUser({ email: 'student@example.com', role: 'user' });
const admin = () => createUser({ email: 'admin@example.com', role: 'admin' });

const createAssignment = (authorization: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/assignments')
    .set('Authorization', authorization)
    .send({ title: 'Loop exercises', ...body });

describe('DSE-14: teachers create and edit assignments', () => {
  it('creates a draft assignment owned by the teacher', async () => {
    const user = await teacher();

    const response = await createAssignment(bearerFor(user), {
      description: 'Practice loops',
      dueDate: '2026-12-01T23:59:00.000Z',
      maxScore: 50
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'Loop exercises',
      description: 'Practice loops',
      instructions: '',
      status: 'draft',
      maxScore: 50,
      dueDate: '2026-12-01T23:59:00.000Z'
    });
    expect(response.body.createdBy).toBe(String(user._id));
    expect(response.body).not.toHaveProperty('__v');
  });

  it('accepts creating directly as published', async () => {
    const response = await createAssignment(bearerFor(await teacher()), { status: 'published' });

    expect(response.status).toBe(201);
    expect(response.body.status).toBe('published');
  });

  it('treats a null due date on create as "no deadline"', async () => {
    const response = await createAssignment(bearerFor(await teacher()), { dueDate: null });

    expect(response.status).toBe(201);
    const stored = await AssignmentModel.findById(response.body._id);
    expect(stored?.dueDate).toBeUndefined();
  });

  it('rejects invalid create bodies', async () => {
    const auth = bearerFor(await teacher());

    expect((await createAssignment(auth, { title: '   ' })).status).toBe(400);
    expect((await createAssignment(auth, { status: 'archived' })).status).toBe(400);
    expect((await createAssignment(auth, { maxScore: -1 })).status).toBe(400);
    expect((await createAssignment(auth, { dueDate: 'not-a-date' })).status).toBe(400);
  });

  it('answers 403 for students and 401 without a token', async () => {
    expect((await createAssignment(bearerFor(await student()))).status).toBe(403);
    expect((await api().post('/api/assignments').send({ title: 'No token' })).status).toBe(401);
  });

  it('updates the own assignment', async () => {
    const auth = bearerFor(await teacher());
    const { body: created } = await createAssignment(auth);

    const updated = await api()
      .patch(`/api/assignments/${created._id}`)
      .set('Authorization', auth)
      .send({ title: 'Loops v2', instructions: 'Use for loops.', status: 'published', maxScore: 10 });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      title: 'Loops v2',
      instructions: 'Use for loops.',
      status: 'published',
      maxScore: 10
    });
  });

  it('clears the due date with null', async () => {
    const auth = bearerFor(await teacher());
    const { body: created } = await createAssignment(auth, { dueDate: '2026-12-01T00:00:00.000Z' });

    const cleared = await api()
      .patch(`/api/assignments/${created._id}`)
      .set('Authorization', auth)
      .send({ dueDate: null });

    expect(cleared.status).toBe(200);
    expect(cleared.body.dueDate).toBeNull();
  });

  it('rejects empty updates and invalid ids', async () => {
    const auth = bearerFor(await teacher());
    const { body: created } = await createAssignment(auth);

    const empty = await api().patch(`/api/assignments/${created._id}`).set('Authorization', auth).send({});
    expect(empty.status).toBe(400);

    expect((await api().get('/api/assignments/not-an-id').set('Authorization', auth)).status).toBe(400);
  });

  it("hides another teacher's assignment behind a 404 for edit and delete", async () => {
    const alice = await teacher();
    const { body: created } = await createAssignment(bearerFor(alice));
    const bobAuth = bearerFor(await otherTeacher());

    expect((await api().patch(`/api/assignments/${created._id}`).set('Authorization', bobAuth).send({ title: 'x' })).status).toBe(404);
    expect((await api().delete(`/api/assignments/${created._id}`).set('Authorization', bobAuth)).status).toBe(404);
    expect(await AssignmentModel.countDocuments()).toBe(1);
  });

  it('answers 403 when a student tries to edit or delete', async () => {
    const { body: created } = await createAssignment(bearerFor(await teacher()));
    const studentAuth = bearerFor(await student());

    expect((await api().patch(`/api/assignments/${created._id}`).set('Authorization', studentAuth).send({ title: 'x' })).status).toBe(403);
    expect((await api().delete(`/api/assignments/${created._id}`).set('Authorization', studentAuth)).status).toBe(403);
    expect(await AssignmentModel.countDocuments()).toBe(1);
  });

  it('deletes the own assignment', async () => {
    const auth = bearerFor(await teacher());
    const { body: created } = await createAssignment(auth);

    expect((await api().delete(`/api/assignments/${created._id}`).set('Authorization', auth)).status).toBe(204);
    expect(await AssignmentModel.countDocuments()).toBe(0);
  });
});

describe('DSE-16: students (and teachers) read assignments', () => {
  it('lists every non-draft assignment from every teacher, paginated and sorted', async () => {
    const alice = await teacher();
    const bob = await otherTeacher();
    await createAssignment(bearerFor(alice), { title: 'Loops', status: 'published' });
    await createAssignment(bearerFor(alice), { title: 'Hidden draft' });
    await createAssignment(bearerFor(bob), { title: 'Arrays', status: 'published' });
    await createAssignment(bearerFor(bob), { title: 'Closed quiz', status: 'closed' });

    const response = await api()
      .get('/api/assignments?page=1&limit=2&sort=title')
      .set('Authorization', bearerFor(await student()));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(response.body.items.map((item: { title: string }) => item.title)).toEqual(['Arrays', 'Closed quiz']);
  });

  it("lists only the teacher's own assignments, drafts included", async () => {
    const alice = await teacher();
    await createAssignment(bearerFor(alice), { title: 'Mine', status: 'published' });
    await createAssignment(bearerFor(alice), { title: 'My draft' });
    await createAssignment(bearerFor(await otherTeacher()), { title: 'Theirs', status: 'published' });

    const response = await api().get('/api/assignments?sort=title').set('Authorization', bearerFor(alice));

    expect(response.body.total).toBe(2);
    expect(response.body.items.map((item: { title: string }) => item.title)).toEqual(['Mine', 'My draft']);
  });

  it('lists everything for an admin', async () => {
    await createAssignment(bearerFor(await teacher()), { title: 'A', status: 'draft' });
    await createAssignment(bearerFor(await otherTeacher()), { title: 'B', status: 'published' });

    const response = await api().get('/api/assignments').set('Authorization', bearerFor(await admin()));

    expect(response.body.total).toBe(2);
  });

  it('reads a published assignment but hides drafts behind a 404', async () => {
    const owner = await teacher();
    const ownerAuth = bearerFor(owner);
    const { body: published } = await createAssignment(ownerAuth, { title: 'Published', status: 'published' });
    const { body: draft } = await createAssignment(ownerAuth, { title: 'Draft' });
    const studentAuth = bearerFor(await student());
    const otherTeacherAuth = bearerFor(await otherTeacher());

    const read = await api().get(`/api/assignments/${published._id}`).set('Authorization', studentAuth);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe('Published');

    // The draft is invisible to students and other teachers alike (404, not 403).
    expect((await api().get(`/api/assignments/${draft._id}`).set('Authorization', studentAuth)).status).toBe(404);
    expect((await api().get(`/api/assignments/${draft._id}`).set('Authorization', otherTeacherAuth)).status).toBe(404);
    // ...but the owner still sees it.
    const own = await api().get(`/api/assignments/${draft._id}`).set('Authorization', ownerAuth);
    expect(own.status).toBe(200);
    expect(own.body.status).toBe('draft');
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/assignments')).status).toBe(401);
  });

  it('rejects invalid paging and sort parameters', async () => {
    const auth = bearerFor(await student());

    expect((await api().get('/api/assignments?limit=1000').set('Authorization', auth)).status).toBe(400);
    expect((await api().get('/api/assignments?sort=createdBy').set('Authorization', auth)).status).toBe(400);
  });
});

describe('assignments: admin override', () => {
  it('lets an admin edit and delete any assignment', async () => {
    const { body: created } = await createAssignment(bearerFor(await teacher()), { title: 'Teacher work' });
    const adminAuth = bearerFor(await admin());

    const updated = await api().patch(`/api/assignments/${created._id}`).set('Authorization', adminAuth).send({ status: 'published' });
    expect(updated.status).toBe(200);
    expect(updated.body.status).toBe('published');

    expect((await api().delete(`/api/assignments/${created._id}`).set('Authorization', adminAuth)).status).toBe(204);
  });
});
