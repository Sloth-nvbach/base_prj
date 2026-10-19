// DSE-17: students submit code for a published assignment (any number of
// times — the history is kept). DSE-19: submissions are gated by access
// rights and the deadline; GET submission-access answers the same rules.
import { describe, expect, it } from 'vitest';
import { SubmissionModel } from '../../src/models/submission.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

// Several accounts of the same role can be needed inside one test, and the
// email index is unique — so every call gets its own address.
let sequence = 0;
const uniqueEmail = (prefix: string) => `${prefix}${(sequence += 1)}@example.com`;

const teacher = () => createUser({ email: uniqueEmail('teacher'), role: 'teacher' });
const student = () => createUser({ email: uniqueEmail('student'), role: 'student' });
const otherStudent = () => createUser({ email: uniqueEmail('student'), role: 'student' });
const admin = () => createUser({ email: uniqueEmail('admin'), role: 'admin' });

/** Creates an assignment through the API, published unless the body says otherwise. */
const createAssignment = async (body: Record<string, unknown> = {}) => {
  const { body: created } = await api()
    .post('/api/assignments')
    .set('Authorization', bearerFor(await teacher()))
    .send({ title: 'Loop exercises', status: 'published', ...body });
  return created;
};

const submit = (authorization: string, assignmentId: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/submissions')
    .set('Authorization', authorization)
    .send({ assignment: assignmentId, code: 'console.log("hi");', ...body });

const access = (authorization: string, assignmentId: string) =>
  api().get(`/api/assignments/${assignmentId}/submission-access`).set('Authorization', authorization);

describe('DSE-17: students submit code', () => {
  it('saves a submission for a published assignment', async () => {
    const assignment = await createAssignment();
    const user = await student();

    const response = await submit(bearerFor(user), assignment._id);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      assignment: assignment._id,
      student: String(user._id),
      code: 'console.log("hi");',
      language: 'javascript',
      status: 'submitted'
    });
    expect(response.body.submittedAt).toBeTruthy();
    expect(response.body).not.toHaveProperty('__v');
  });

  it('lets the student pick the language', async () => {
    const assignment = await createAssignment();

    const response = await submit(bearerFor(await student()), assignment._id, { language: 'python' });

    expect(response.status).toBe(201);
    expect(response.body.language).toBe('python');
  });

  it('keeps every submission in the history', async () => {
    const assignment = await createAssignment();
    const auth = bearerFor(await student());

    const first = await submit(auth, assignment._id, { code: 'console.log("first");' });
    const second = await submit(auth, assignment._id, { code: 'console.log("second");' });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(await SubmissionModel.countDocuments()).toBe(2);
  });

  it('validates the body', async () => {
    const assignment = await createAssignment();
    const auth = bearerFor(await student());

    const noCode = await submit(auth, assignment._id, { code: undefined });
    expect(noCode.status).toBe(400);
    expect(noCode.body.errors[0].field).toBe('code');

    expect((await submit(auth, assignment._id, { code: '   ' })).status).toBe(400);
    expect((await submit(auth, assignment._id, { language: 'brainfuck' })).status).toBe(400);
    expect((await submit(auth, 'not-an-id')).status).toBe(400);
    expect((await submit(auth, undefined)).status).toBe(400);
  });

  it('allows only signed-in students', async () => {
    const assignment = await createAssignment();

    expect((await submit(bearerFor(await teacher()), assignment._id)).status).toBe(403);
    expect((await submit(bearerFor(await admin()), assignment._id)).status).toBe(403);
    expect((await api().post('/api/submissions').send({ assignment: assignment._id, code: 'x' })).status).toBe(401);
  });
});

describe('DSE-19: access and deadline rules block submission', () => {
  it('hides draft assignments behind a 404', async () => {
    const assignment = await createAssignment({ status: 'draft' });

    expect((await submit(bearerFor(await student()), assignment._id)).status).toBe(404);
  });

  it('answers 404 for a missing assignment', async () => {
    const missing = 'aaaaaaaaaaaaaaaaaaaaaaaa';
    expect((await submit(bearerFor(await student()), missing)).status).toBe(404);
  });

  it('rejects a closed assignment with 403', async () => {
    const assignment = await createAssignment({ status: 'closed' });

    const response = await submit(bearerFor(await student()), assignment._id);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Assignment is closed for submissions');
    expect(await SubmissionModel.countDocuments()).toBe(0);
  });

  it('rejects a submission past the deadline with 403', async () => {
    const assignment = await createAssignment({ dueDate: '2020-01-01T00:00:00.000Z' });

    const response = await submit(bearerFor(await student()), assignment._id);

    expect(response.status).toBe(403);
    expect(response.body.message).toBe('Deadline has passed');
    expect(await SubmissionModel.countDocuments()).toBe(0);
  });

  it('accepts a submission before a future deadline', async () => {
    const assignment = await createAssignment({ dueDate: '2099-01-01T00:00:00.000Z' });

    expect((await submit(bearerFor(await student()), assignment._id)).status).toBe(201);
  });
});

describe('DSE-19: GET /api/assignments/:id/submission-access', () => {
  it('answers canSubmit for an open assignment', async () => {
    const assignment = await createAssignment();

    const response = await access(bearerFor(await student()), assignment._id);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ canSubmit: true });
  });

  it('reports the deadline reason without failing', async () => {
    const assignment = await createAssignment({ dueDate: '2020-01-01T00:00:00.000Z' });

    const response = await access(bearerFor(await student()), assignment._id);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ canSubmit: false, reason: 'Deadline has passed' });
  });

  it('reports the closed reason', async () => {
    const assignment = await createAssignment({ status: 'closed' });

    const response = await access(bearerFor(await student()), assignment._id);

    expect(response.body).toEqual({ canSubmit: false, reason: 'Assignment is closed for submissions' });
  });

  it('reports that only students submit', async () => {
    const assignment = await createAssignment();

    const response = await access(bearerFor(await teacher()), assignment._id);

    expect(response.body).toEqual({ canSubmit: false, reason: 'Only students can submit' });
  });

  it('keeps drafts hidden behind a 404 and requires authentication', async () => {
    const assignment = await createAssignment({ status: 'draft' });

    expect((await access(bearerFor(await student()), assignment._id)).status).toBe(404);
    expect((await access('', assignment._id)).status).toBe(401);
  });
});

describe('GET /api/submissions (own history)', () => {
  it('lists only the own submissions, newest first, paginated', async () => {
    const assignment = await createAssignment();
    const auth = bearerFor(await student());
    await submit(auth, assignment._id, { code: 'console.log("first");' });
    await submit(auth, assignment._id, { code: 'console.log("second");' });
    await submit(bearerFor(await otherStudent()), assignment._id, { code: 'console.log("other");' });

    const response = await api().get(`/api/submissions?assignment=${assignment._id}&sort=-createdAt`).set('Authorization', auth);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, limit: 20, total: 2, totalPages: 1 });
    expect(response.body.items.map((item: { code: string }) => item.code)).toEqual([
      'console.log("second");',
      'console.log("first");'
    ]);
  });

  it('sees all its submissions across assignments without the filter', async () => {
    const first = await createAssignment();
    const second = await createAssignment({ title: 'Arrays' });
    const auth = bearerFor(await student());
    await submit(auth, first._id);
    await submit(auth, second._id);

    const all = await api().get('/api/submissions').set('Authorization', auth);
    expect(all.body.total).toBe(2);

    const one = await api().get(`/api/submissions?assignment=${first._id}`).set('Authorization', auth);
    expect(one.body.total).toBe(1);
  });

  it('names the assignment in every history row, with public fields only', async () => {
    const loops = await createAssignment({ title: 'Loops' });
    const arrays = await createAssignment({ title: 'Arrays' });
    const auth = bearerFor(await student());
    await submit(auth, loops._id);
    await submit(auth, arrays._id);

    const response = await api().get('/api/submissions?sort=createdAt').set('Authorization', auth);

    const titles = response.body.items.map((item: { assignment: { title: string } }) => item.assignment.title);
    expect(titles).toEqual(['Loops', 'Arrays']);
    for (const item of response.body.items) {
      expect(item.assignment).not.toHaveProperty('description');
      expect(item.assignment).not.toHaveProperty('instructions');
      expect(item.assignment).not.toHaveProperty('__v');
    }
  });

  it('still lists the history when the assignment was deleted, without its name', async () => {
    const teacherUser = await teacher();
    const teacherAuth = bearerFor(teacherUser);
    const { body: assignment } = await api()
      .post('/api/assignments')
      .set('Authorization', teacherAuth)
      .send({ title: 'Gone later', status: 'published' });
    const auth = bearerFor(await student());
    await submit(auth, assignment._id);

    expect((await api().delete(`/api/assignments/${assignment._id}`).set('Authorization', teacherAuth)).status).toBe(204);

    const response = await api().get('/api/submissions').set('Authorization', auth);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].assignment).toBeNull();
  });

  it('never shows other students their submissions', async () => {
    const assignment = await createAssignment();
    await submit(bearerFor(await student()), assignment._id);

    const response = await api().get(`/api/submissions?assignment=${assignment._id}`).set('Authorization', bearerFor(await otherStudent()));

    expect(response.body.total).toBe(0);
  });

  it('requires authentication and valid parameters', async () => {
    const auth = bearerFor(await student());

    expect((await api().get('/api/submissions')).status).toBe(401);
    expect((await api().get('/api/submissions?limit=1000').set('Authorization', auth)).status).toBe(400);
    expect((await api().get('/api/submissions?sort=code').set('Authorization', auth)).status).toBe(400);
    expect((await api().get('/api/submissions?assignment=not-an-id').set('Authorization', auth)).status).toBe(400);
  });
});
