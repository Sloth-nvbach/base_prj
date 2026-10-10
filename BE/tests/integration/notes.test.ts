// Reference module tests: copy this file when creating a new resource.
import { describe, expect, it } from 'vitest';
import { NoteModel } from '../../src/models/note.model';
import { api } from '../helpers/api';
import { bearerFor, createUser } from '../helpers/user-factory';

const createNote = (authorization: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/notes')
    .set('Authorization', authorization)
    .send({ title: 'Math homework', content: 'Page 42', tags: ['School'], ...body });

describe('notes CRUD', () => {
  it('creates a note owned by the caller, normalizing tags', async () => {
    const user = await createUser({});

    const response = await createNote(bearerFor(user), { tags: ['School', 'school', ' Math '] });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ title: 'Math homework', content: 'Page 42', tags: ['school', 'math'] });
    expect(response.body.owner).toBe(String(user._id));
    expect(response.body).not.toHaveProperty('__v');
  });

  it('reads, updates and deletes a note', async () => {
    const user = await createUser({});
    const auth = bearerFor(user);
    const { body: note } = await createNote(auth);

    const read = await api().get(`/api/notes/${note._id}`).set('Authorization', auth);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe('Math homework');

    const updated = await api().patch(`/api/notes/${note._id}`).set('Authorization', auth).send({ title: 'Physics' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ title: 'Physics', content: 'Page 42' });

    const removed = await api().delete(`/api/notes/${note._id}`).set('Authorization', auth);
    expect(removed.status).toBe(204);
    expect(await NoteModel.countDocuments()).toBe(0);
  });

  it('validates the body, the id and empty updates', async () => {
    const auth = bearerFor(await createUser({}));

    const noTitle = await createNote(auth, { title: '   ' });
    expect(noTitle.status).toBe(400);
    expect(noTitle.body.errors[0].field).toBe('title');

    expect((await api().get('/api/notes/not-an-id').set('Authorization', auth)).status).toBe(400);

    const { body: note } = await createNote(auth);
    const empty = await api().patch(`/api/notes/${note._id}`).set('Authorization', auth).send({});
    expect(empty.status).toBe(400);
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/notes')).status).toBe(401);
  });
});

describe('notes ownership', () => {
  it('hides other users\' notes behind a 404', async () => {
    const alice = await createUser({ email: 'alice@example.com' });
    const bob = await createUser({ email: 'bob@example.com' });
    const { body: note } = await createNote(bearerFor(alice));
    const bobAuth = bearerFor(bob);

    expect((await api().get(`/api/notes/${note._id}`).set('Authorization', bobAuth)).status).toBe(404);
    expect((await api().patch(`/api/notes/${note._id}`).set('Authorization', bobAuth).send({ title: 'x' })).status).toBe(404);
    expect((await api().delete(`/api/notes/${note._id}`).set('Authorization', bobAuth)).status).toBe(404);
    expect((await api().get('/api/notes').set('Authorization', bobAuth)).body.total).toBe(0);
    expect(await NoteModel.countDocuments()).toBe(1);
  });

  it('lets an admin list everyone\'s notes with all=true and edit them', async () => {
    const alice = await createUser({ email: 'alice@example.com' });
    const admin = await createUser({ email: 'admin@example.com', role: 'admin' });
    const { body: note } = await createNote(bearerFor(alice));
    const adminAuth = bearerFor(admin);

    expect((await api().get('/api/notes').set('Authorization', adminAuth)).body.total).toBe(0);
    expect((await api().get('/api/notes?all=true').set('Authorization', adminAuth)).body.total).toBe(1);

    const edit = await api().patch(`/api/notes/${note._id}`).set('Authorization', adminAuth).send({ title: 'Checked' });
    expect(edit.status).toBe(200);
  });

  it('ignores all=true for regular users', async () => {
    await createNote(bearerFor(await createUser({ email: 'alice@example.com' })));
    const bob = await createUser({ email: 'bob@example.com' });

    const response = await api().get('/api/notes?all=true').set('Authorization', bearerFor(bob));

    expect(response.body.total).toBe(0);
  });
});

describe('GET /api/notes (list)', () => {
  it('paginates newest first', async () => {
    const auth = bearerFor(await createUser({}));
    for (let i = 1; i <= 5; i += 1) await createNote(auth, { title: `Note ${i}` });

    const response = await api().get('/api/notes?page=2&limit=2').set('Authorization', auth);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
    expect(response.body.items.map((note: { title: string }) => note.title)).toEqual(['Note 3', 'Note 2']);
  });

  it('searches title and content case-insensitively, treating input as plain text', async () => {
    const auth = bearerFor(await createUser({}));
    await createNote(auth, { title: 'Chemistry', content: 'Lab report' });
    await createNote(auth, { title: 'History', content: 'Essay (draft)' });

    const byContent = await api().get('/api/notes?q=LAB').set('Authorization', auth);
    expect(byContent.body.items.map((n: { title: string }) => n.title)).toEqual(['Chemistry']);

    const special = await api().get(`/api/notes?q=${encodeURIComponent('(draft')}`).set('Authorization', auth);
    expect(special.body.items.map((n: { title: string }) => n.title)).toEqual(['History']);
  });

  it('filters by tag', async () => {
    const auth = bearerFor(await createUser({}));
    await createNote(auth, { title: 'A', tags: ['math'] });
    await createNote(auth, { title: 'B', tags: ['art'] });

    const response = await api().get('/api/notes?tag=Math').set('Authorization', auth);

    expect(response.body.items.map((n: { title: string }) => n.title)).toEqual(['A']);
  });

  it('sorts by an allowed field and rejects others', async () => {
    const auth = bearerFor(await createUser({}));
    await createNote(auth, { title: 'Banana' });
    await createNote(auth, { title: 'Apple' });

    const byTitle = await api().get('/api/notes?sort=title').set('Authorization', auth);
    expect(byTitle.body.items.map((n: { title: string }) => n.title)).toEqual(['Apple', 'Banana']);

    expect((await api().get('/api/notes?sort=owner').set('Authorization', auth)).status).toBe(400);
  });

  it('rejects invalid paging parameters', async () => {
    const auth = bearerFor(await createUser({}));
    expect((await api().get('/api/notes?limit=1000').set('Authorization', auth)).status).toBe(400);
    expect((await api().get('/api/notes?page=0').set('Authorization', auth)).status).toBe(400);
  });
});
