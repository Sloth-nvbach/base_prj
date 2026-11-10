// DSE-56, DSE-49, DSE-50: Course/Class/Enrollment CRUD
import { beforeEach, describe, expect, it } from 'vitest';
import { CourseModel, ClassModel, EnrollmentModel } from '../../src/models/course.model';
import { api } from '../helpers/api';
import { bearerFor, createUser, teacher, student, admin } from '../helpers/user-factory';

const otherTeacher = () => createUser({ role: 'teacher' });

const createCourse = (authorization: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/courses')
    .set('Authorization', authorization)
    .send({ title: 'JavaScript Basics', ...body });

const createClass = (authorization: string, body: Record<string, unknown> = {}) =>
  api()
    .post('/api/classes')
    .set('Authorization', authorization)
    .send({ courseId: '', name: 'Section A', enrollCode: 'ABC123', ...body });

describe('DSE-56/49: Course CRUD', () => {
  it('creates a draft course owned by the teacher', async () => {
    const user = await teacher();
    const response = await createCourse(bearerFor(user), {
      description: 'Learn JS fundamentals',
      status: 'draft'
    });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      title: 'JavaScript Basics',
      description: 'Learn JS fundamentals',
      status: 'draft',
      createdBy: String(user._id)
    });
    expect(response.body).not.toHaveProperty('__v');
  });

  it('accepts creating directly as published', async () => {
    const response = await createCourse(bearerFor(await teacher()), { status: 'published' });
    expect(response.status).toBe(201);
    expect(response.body.status).toBe('published');
  });

  it('rejects invalid create bodies', async () => {
    const auth = bearerFor(await teacher());
    expect((await createCourse(auth, { title: '   ' })).status).toBe(400);
    expect((await createCourse(auth, { status: 'invalid' })).status).toBe(400);
  });

  it('answers 403 for students and 401 without a token', async () => {
    expect((await createCourse(bearerFor(await student()))).status).toBe(403);
    expect((await api().post('/api/courses').send({ title: 'No token' })).status).toBe(401);
  });

  it('updates the own course', async () => {
    const auth = bearerFor(await teacher());
    const { body: created } = await createCourse(auth);

    const updated = await api()
      .patch(`/api/courses/${created._id}`)
      .set('Authorization', auth)
      .send({ title: 'JavaScript Advanced', description: 'Advanced topics', status: 'published' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      title: 'JavaScript Advanced',
      description: 'Advanced topics',
      status: 'published'
    });
  });

  it("hides another teacher's course behind a 404 for edit and delete", async () => {
    const alice = await teacher();
    const { body: created } = await createCourse(bearerFor(alice));
    const bobAuth = bearerFor(await otherTeacher());

    expect((await api().patch(`/api/courses/${created._id}`).set('Authorization', bobAuth).send({ title: 'x' })).status).toBe(404);
    expect((await api().delete(`/api/courses/${created._id}`).set('Authorization', bobAuth)).status).toBe(404);
    expect(await CourseModel.countDocuments()).toBe(1);
  });

  it('answers 403 when a student tries to edit or delete', async () => {
    const { body: created } = await createCourse(bearerFor(await teacher()));
    const studentAuth = bearerFor(await student());

    expect((await api().patch(`/api/courses/${created._id}`).set('Authorization', studentAuth).send({ title: 'x' })).status).toBe(403);
    expect((await api().delete(`/api/courses/${created._id}`).set('Authorization', studentAuth)).status).toBe(403);
    expect(await CourseModel.countDocuments()).toBe(1);
  });

  it('deletes the own course', async () => {
    const auth = bearerFor(await teacher());
    const { body: created } = await createCourse(auth);

    expect((await api().delete(`/api/courses/${created._id}`).set('Authorization', auth)).status).toBe(204);
    expect(await CourseModel.countDocuments()).toBe(0);
  });
});

describe('DSE-56/49: Students (and teachers) read courses', () => {
  it('lists every non-draft course from every teacher, paginated and sorted', async () => {
    const alice = await teacher();
    const bob = await otherTeacher();
    await createCourse(bearerFor(alice), { title: 'JS Basics', status: 'published' });
    await createCourse(bearerFor(alice), { title: 'Hidden draft' });
    await createCourse(bearerFor(bob), { title: 'React Basics', status: 'published' });
    await createCourse(bearerFor(bob), { title: 'Archived course', status: 'archived' });

    const response = await api()
      .get('/api/courses?page=1&limit=2&sort=title')
      .set('Authorization', bearerFor(await student()));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    expect(response.body.items.map((item: { title: string }) => item.title)).toEqual(['Archived course', 'JS Basics']);
  });

  it("lists only the teacher's own courses, drafts included", async () => {
    const alice = await teacher();
    await createCourse(bearerFor(alice), { title: 'Mine', status: 'published' });
    await createCourse(bearerFor(alice), { title: 'My draft' });
    await createCourse(bearerFor(await otherTeacher()), { title: 'Theirs', status: 'published' });

    const response = await api().get('/api/courses?sort=title').set('Authorization', bearerFor(alice));

    expect(response.body.total).toBe(2);
    expect(response.body.items.map((item: { title: string }) => item.title)).toEqual(['Mine', 'My draft']);
  });

  it('lists everything for an admin', async () => {
    await createCourse(bearerFor(await teacher()), { title: 'A', status: 'draft' });
    await createCourse(bearerFor(await otherTeacher()), { title: 'B', status: 'published' });

    const response = await api().get('/api/courses').set('Authorization', bearerFor(await admin()));
    expect(response.body.total).toBe(2);
  });

  it('reads a published course but hides drafts behind a 404', async () => {
    const owner = await teacher();
    const ownerAuth = bearerFor(owner);
    const { body: published } = await createCourse(ownerAuth, { title: 'Published', status: 'published' });
    const { body: draft } = await createCourse(ownerAuth, { title: 'Draft' });
    const studentAuth = bearerFor(await student());
    const otherTeacherAuth = bearerFor(await otherTeacher());

    const read = await api().get(`/api/courses/${published._id}`).set('Authorization', studentAuth);
    expect(read.status).toBe(200);
    expect(read.body.title).toBe('Published');

    expect((await api().get(`/api/courses/${draft._id}`).set('Authorization', studentAuth)).status).toBe(404);
    expect((await api().get(`/api/courses/${draft._id}`).set('Authorization', otherTeacherAuth)).status).toBe(404);

    const own = await api().get(`/api/courses/${draft._id}`).set('Authorization', ownerAuth);
    expect(own.status).toBe(200);
    expect(own.body.status).toBe('draft');
  });

  it('requires authentication', async () => {
    expect((await api().get('/api/courses')).status).toBe(401);
  });

  it('rejects invalid paging and sort parameters', async () => {
    const auth = bearerFor(await student());
    expect((await api().get('/api/courses?limit=1000').set('Authorization', auth)).status).toBe(400);
    expect((await api().get('/api/courses?sort=createdBy').set('Authorization', auth)).status).toBe(400);
  });
});

describe('DSE-56/50: Class CRUD', () => {
  let courseId: string;
  let teacherAuth: string;
  let teacherUser: { _id: string; email: string };

  beforeEach(async () => {
    const user = await teacher();
    teacherUser = user;
    teacherAuth = bearerFor(user);
    const response = await createCourse(teacherAuth, { status: 'published' });
    courseId = response.body._id;
  });

  it('creates a class for a course owned by the teacher', async () => {
    const response = await createClass(teacherAuth, { courseId, name: 'Section A', enrollCode: 'ABC123' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      courseId,
      name: 'Section A',
      enrollCode: 'ABC123',
      teacherId: String(teacherUser._id),
      maxStudents: 50,
      status: 'planned'
    });
  });

  it('rejects creating class for non-existent course', async () => {
    const auth = bearerFor(await teacher());
    const response = await createClass(auth, { courseId: '507f1f77bcf86cd799439011', enrollCode: 'XYZ789' });
    expect(response.status).toBe(404);
  });

  it('rejects creating class for another teacher\'s course', async () => {
    const alice = await teacher();
    const aliceAuth = bearerFor(alice);
    const course = await createCourse(aliceAuth, { status: 'published' });
    const bobAuth = bearerFor(await otherTeacher());
    const response = await createClass(bobAuth, { courseId: course.body._id, enrollCode: 'XYZ789' });
    expect(response.status).toBe(404);
  });

  it('rejects duplicate enrollCode', async () => {
    await createClass(teacherAuth, { courseId, enrollCode: 'ABC123' });
    const response = await createClass(teacherAuth, { courseId, enrollCode: 'ABC123' });
    expect(response.status).toBe(409);
  });

  it('rejects invalid class bodies', async () => {
    expect((await createClass(teacherAuth, { courseId, enrollCode: 'ABC' })).status).toBe(400);
    expect((await createClass(teacherAuth, { courseId, enrollCode: 'ABCDEFGHIJKLM' })).status).toBe(400);
    expect((await createClass(teacherAuth, { courseId, enrollCode: 'ABC123', maxStudents: 0 })).status).toBe(400);
    expect((await createClass(teacherAuth, { courseId, enrollCode: 'ABC123', maxStudents: 501 })).status).toBe(400);
    expect((await createClass(teacherAuth, { courseId, enrollCode: 'ABC123', status: 'invalid' })).status).toBe(400);
  });

  it('answers 403 for students and 401 without token', async () => {
    expect((await createClass(bearerFor(await student()), { courseId, enrollCode: 'ABC123' })).status).toBe(403);
    expect((await api().post('/api/classes').send({ courseId, enrollCode: 'ABC123' })).status).toBe(401);
  });

  it('updates own class', async () => {
    const { body: created } = await createClass(teacherAuth, { courseId, enrollCode: 'AAA111' });

    const updated = await api()
      .patch(`/api/classes/${created._id}`)
      .set('Authorization', teacherAuth)
      .send({ name: 'Section B', schedule: 'Mon/Wed 10-12', maxStudents: 30, status: 'active' });

    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({
      name: 'Section B',
      schedule: 'Mon/Wed 10-12',
      maxStudents: 30,
      status: 'active'
    });
  });

  it('rejects updating enrollCode to existing one', async () => {
    const { body: created1 } = await createClass(teacherAuth, { courseId, enrollCode: 'AAA111' });
    await createClass(teacherAuth, { courseId, enrollCode: 'BBB222' });

    const response = await api()
      .patch(`/api/classes/${created1._id}`)
      .set('Authorization', teacherAuth)
      .send({ enrollCode: 'BBB222' });

    expect(response.status).toBe(409);
  });

  it("hides another teacher's class behind 404 for edit and delete", async () => {
    const alice = await teacher();
    const aliceAuth = bearerFor(alice);
    const course = await createCourse(aliceAuth, { status: 'published' });
    const { body: created } = await createClass(aliceAuth, { courseId: course.body._id, enrollCode: 'AAA111' });
    const bobAuth = bearerFor(await otherTeacher());

    expect((await api().patch(`/api/classes/${created._id}`).set('Authorization', bobAuth).send({ name: 'x' })).status).toBe(404);
    expect((await api().delete(`/api/classes/${created._id}`).set('Authorization', bobAuth)).status).toBe(404);
  });

  it('answers 403 when student tries to edit or delete', async () => {
    const { body: created } = await createClass(teacherAuth, { courseId, enrollCode: 'ABC123' });
    const studentAuth = bearerFor(await student());

    expect((await api().patch(`/api/classes/${created._id}`).set('Authorization', studentAuth).send({ name: 'x' })).status).toBe(403);
    expect((await api().delete(`/api/classes/${created._id}`).set('Authorization', studentAuth)).status).toBe(403);
  });

  it('deletes own class', async () => {
    const { body: created } = await createClass(teacherAuth, { courseId, enrollCode: 'ABC123' });

    expect((await api().delete(`/api/classes/${created._id}`).set('Authorization', teacherAuth)).status).toBe(204);
    expect(await ClassModel.countDocuments()).toBe(0);
  });
});

describe('DSE-56/50: Students and teachers read classes', () => {
  let courseId: string;
  let courseId2: string;
  let classId: string;
  let teacher1Auth: string;
  let teacher2Auth: string;

  beforeEach(async () => {
    const teacher1 = await teacher();
    teacher1Auth = bearerFor(teacher1);
    const teacher2 = await otherTeacher();
    teacher2Auth = bearerFor(teacher2);

    const course = await createCourse(teacher1Auth, { status: 'published' });
    courseId = course.body._id;

    const course2 = await createCourse(teacher2Auth, { status: 'published' });
    courseId2 = course2.body._id;

    const cls = await createClass(teacher1Auth, { courseId, enrollCode: 'AAA111', status: 'active' });
    classId = cls.body._id;
    await createClass(teacher1Auth, { courseId, enrollCode: 'BBB222', status: 'planned' });
    await createClass(teacher2Auth, { courseId: courseId2, enrollCode: 'CCC333', status: 'active' });
  });

  it('lists classes where student is enrolled', async () => {
    const student1 = await student();
    const studentAuth = bearerFor(student1);

    await api().post('/api/enrollments').set('Authorization', studentAuth).send({ enrollCode: 'AAA111' });

    const response = await api().get('/api/classes').set('Authorization', studentAuth);
    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0]._id).toBe(classId);
  });

  it("lists teacher's own classes", async () => {
    const response = await api().get('/api/classes').set('Authorization', teacher1Auth);
    expect(response.body.total).toBe(2);
  });

  it('lists all classes for admin', async () => {
    const response = await api().get('/api/classes').set('Authorization', bearerFor(await admin()));
    expect(response.body.total).toBe(3);
  });
});

describe('DSE-56/50: Enrollment', () => {
  let courseId: string;
  let classId: string;
  let teacherAuth: string;

  beforeEach(async () => {
    const t = await teacher();
    teacherAuth = bearerFor(t);
    const course = await createCourse(teacherAuth, { status: 'published' });
    courseId = course.body._id;
    const cls = await createClass(teacherAuth, { courseId, enrollCode: 'ABC123', maxStudents: 2, status: 'active' });
    classId = cls.body._id;
  });

  it('enrolls student via enroll code', async () => {
    const s = await student();
    const auth = bearerFor(s);
    const response = await api().post('/api/enrollments').set('Authorization', auth).send({ enrollCode: 'ABC123' });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      studentId: String(s._id),
      classId,
      role: 'student',
      status: 'active'
    });
  });

  it('rejects invalid enroll code', async () => {
    const response = await api().post('/api/enrollments').set('Authorization', bearerFor(await student())).send({ enrollCode: 'INVALID' });
    expect(response.status).toBe(404);
  });

  it('rejects enrollment in full class', async () => {
    const s1 = await student();
    const s2 = await createUser({ role: 'student' });
    const s3 = await createUser({ role: 'student' });

    await api().post('/api/enrollments').set('Authorization', bearerFor(s1)).send({ enrollCode: 'ABC123' });
    await api().post('/api/enrollments').set('Authorization', bearerFor(s2)).send({ enrollCode: 'ABC123' });

    const response = await api().post('/api/enrollments').set('Authorization', bearerFor(s3)).send({ enrollCode: 'ABC123' });
    expect(response.status).toBe(400);
  });

  it('rejects duplicate enrollment', async () => {
    const s = await student();
    const auth = bearerFor(s);
    await api().post('/api/enrollments').set('Authorization', auth).send({ enrollCode: 'ABC123' });
    const response = await api().post('/api/enrollments').set('Authorization', auth).send({ enrollCode: 'ABC123' });
    expect(response.status).toBe(409);
  });

  it('teacher can update enrollment role', async () => {
    const s = await student();
    await api().post('/api/enrollments').set('Authorization', bearerFor(s)).send({ enrollCode: 'ABC123' });

    const enrollments = await EnrollmentModel.find({ classId, studentId: s._id });
    const enrollmentId = enrollments[0]._id.toString();

    const response = await api().patch(`/api/enrollments/${enrollmentId}`).set('Authorization', teacherAuth).send({ role: 'ta' });
    expect(response.status).toBe(200);
    expect(response.body.role).toBe('ta');
  });

  it('student can drop enrollment', async () => {
    const s = await student();
    const auth = bearerFor(s);
    await api().post('/api/enrollments').set('Authorization', auth).send({ enrollCode: 'ABC123' });

    const enrollments = await EnrollmentModel.find({ classId, studentId: s._id });
    const enrollmentId = enrollments[0]._id.toString();

    const response = await api().patch(`/api/enrollments/${enrollmentId}`).set('Authorization', auth).send({ status: 'dropped' });
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('dropped');
  });

  it('student cannot change role', async () => {
    const s = await student();
    const auth = bearerFor(s);
    await api().post('/api/enrollments').set('Authorization', auth).send({ enrollCode: 'ABC123' });

    const enrollments = await EnrollmentModel.find({ classId, studentId: s._id });
    const enrollmentId = enrollments[0]._id.toString();

    const response = await api().patch(`/api/enrollments/${enrollmentId}`).set('Authorization', auth).send({ role: 'ta' });
    expect(response.status).toBe(400);
  });

  it('teacher can delete enrollment', async () => {
    const s = await student();
    await api().post('/api/enrollments').set('Authorization', bearerFor(s)).send({ enrollCode: 'ABC123' });

    const enrollments = await EnrollmentModel.find({ classId, studentId: s._id });
    const enrollmentId = enrollments[0]._id.toString();

    const response = await api().delete(`/api/enrollments/${enrollmentId}`).set('Authorization', teacherAuth);
    expect(response.status).toBe(204);
    expect(await EnrollmentModel.countDocuments({ classId })).toBe(0);
  });

  it('admin can manage any enrollment', async () => {
    const s = await student();
    await api().post('/api/enrollments').set('Authorization', bearerFor(s)).send({ enrollCode: 'ABC123' });

    const enrollments = await EnrollmentModel.find({ classId, studentId: s._id });
    const enrollmentId = enrollments[0]._id.toString();

    const response = await api().delete(`/api/enrollments/${enrollmentId}`).set('Authorization', bearerFor(await admin()));
    expect(response.status).toBe(204);
  });
});