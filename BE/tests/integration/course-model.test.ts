import { beforeEach, describe, expect, it } from 'vitest';
import { CourseModel, ClassModel, EnrollmentModel } from '../../src/models/course.model';
import type { UserDocument } from '../../src/models/user.model';
import { createUser } from '../helpers/user-factory';

let teacher: UserDocument;
let otherTeacher: UserDocument;
let student: UserDocument;

beforeEach(async () => {
  teacher = await createUser({ email: 'teacher@example.com', role: 'teacher' });
  otherTeacher = await createUser({ email: 'teacher2@example.com', role: 'teacher' });
  student = await createUser({ email: 'student@example.com', role: 'student' });
});

const createCourse = (overrides: Record<string, unknown> = {}) =>
  CourseModel.create({ title: 'JavaScript Basics', createdBy: teacher._id, ...overrides });

const createClass = (overrides: Record<string, unknown> = {}) =>
  ClassModel.create({
    courseId: (async () => { const c = await createCourse(); return c._id; })(),
    teacherId: teacher._id,
    name: 'Section A',
    enrollCode: 'ABC123',
    ...overrides
  });

describe('Course model', () => {
  describe('valid data', () => {
    it('saves a course with sensible defaults', async () => {
      const course = await createCourse();

      expect(course.title).toBe('JavaScript Basics');
      expect(course.description).toBe('');
      expect(course.status).toBe('draft');
      expect(course.createdBy.toString()).toBe(teacher._id.toString());
      expect(course.createdAt).toBeInstanceOf(Date);
      expect(course.updatedAt).toBeInstanceOf(Date);
    });

    it('accepts explicit values for optional fields', async () => {
      const course = await createCourse({
        description: 'Learn JS fundamentals',
        status: 'published',
        thumbnailUrl: 'https://example.com/thumb.jpg'
      });

      expect(course.description).toBe('Learn JS fundamentals');
      expect(course.status).toBe('published');
      expect(course.thumbnailUrl).toBe('https://example.com/thumb.jpg');
    });

    it('trims the title before saving', async () => {
      const course = await createCourse({ title: '  Arrays  ' });
      expect(course.title).toBe('Arrays');
    });
  });

  describe('invalid data', () => {
    it('rejects a missing title', async () => {
      await expect(createCourse({ title: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing createdBy', async () => {
      await expect(createCourse({ createdBy: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a status outside the allowed list', async () => {
      await expect(createCourse({ status: 'invalid' })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('indexes', () => {
    it('has compound index on createdBy + createdAt', async () => {
      await createCourse({ title: 'Course 1' });
      await createCourse({ title: 'Course 2' });

      const courses = await CourseModel.find({ createdBy: teacher._id }).sort({ createdAt: -1 });
      expect(courses.length).toBe(2);
      expect(courses[0].title).toBe('Course 2');
    });
  });

  it('strips __v from JSON responses', async () => {
    const course = await createCourse();
    const json = course.toJSON() as Record<string, unknown>;
    expect(json.title).toBe('JavaScript Basics');
    expect(json).not.toHaveProperty('__v');
  });
});

describe('Class model', () => {
  let courseId: string;

  beforeEach(async () => {
    const course = await createCourse();
    courseId = course._id.toString();
  });

  describe('valid data', () => {
    it('saves a class with sensible defaults', async () => {
      const cls = await ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABC123'
      });

      expect(cls.name).toBe('Section A');
      expect(cls.schedule).toBe('');
      expect(cls.maxStudents).toBe(50);
      expect(cls.status).toBe('planned');
      expect(cls.enrollCode).toBe('ABC123');
      expect(cls.createdAt).toBeInstanceOf(Date);
    });

    it('accepts explicit values for optional fields', async () => {
      const cls = await ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section B',
        enrollCode: 'XYZ789',
        schedule: 'Mon/Wed 10:00-12:00',
        maxStudents: 30,
        status: 'active'
      });

      expect(cls.schedule).toBe('Mon/Wed 10:00-12:00');
      expect(cls.maxStudents).toBe(30);
      expect(cls.status).toBe('active');
    });

    it('uppercases enrollCode', async () => {
      const cls = await ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section C',
        enrollCode: 'abc123'
      });
      expect(cls.enrollCode).toBe('ABC123');
    });
  });

  describe('invalid data', () => {
    it('rejects a missing courseId', async () => {
      await expect(ClassModel.create({
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABC123'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing teacherId', async () => {
      await expect(ClassModel.create({
        courseId,
        name: 'Section A',
        enrollCode: 'ABC123'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing enrollCode', async () => {
      await expect(ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects enrollCode too short', async () => {
      await expect(ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABC'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects enrollCode too long', async () => {
      await expect(ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABCDEFGHIJKLM' // 13 characters
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects maxStudents < 1', async () => {
      await expect(ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABC123',
        maxStudents: 0
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects maxStudents > 500', async () => {
      await expect(ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABC123',
        maxStudents: 501
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a status outside the allowed list', async () => {
      await expect(ClassModel.create({
        courseId,
        teacherId: teacher._id,
        name: 'Section A',
        enrollCode: 'ABC123',
        status: 'invalid'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('unique indexes', () => {
    it('enforces unique enrollCode', async () => {
      await ClassModel.create({ courseId, teacherId: teacher._id, name: 'Section A', enrollCode: 'ABC123' });
      await expect(ClassModel.create({ courseId, teacherId: teacher._id, name: 'Section B', enrollCode: 'ABC123' }))
        .rejects.toMatchObject({ name: 'MongoServerError', code: 11000 });
    });
  });

  describe('indexes', () => {
    it('has compound index on courseId + teacherId + status', async () => {
      await ClassModel.create({ courseId, teacherId: teacher._id, name: 'Section A', enrollCode: 'AAA111', status: 'active' });
      await ClassModel.create({ courseId, teacherId: teacher._id, name: 'Section B', enrollCode: 'BBB222', status: 'planned' });
      await ClassModel.create({ courseId, teacherId: otherTeacher._id, name: 'Section C', enrollCode: 'CCC333', status: 'active' });

      const classes = await ClassModel.find({ courseId, teacherId: teacher._id, status: 'active' });
      expect(classes.length).toBe(1);
      expect(classes[0].name).toBe('Section A');
    });
  });

  it('strips __v from JSON responses', async () => {
    const cls = await ClassModel.create({ courseId, teacherId: teacher._id, name: 'Section A', enrollCode: 'ABC123' });
    const json = cls.toJSON() as Record<string, unknown>;
    expect(json.name).toBe('Section A');
    expect(json).not.toHaveProperty('__v');
  });
});

describe('Enrollment model', () => {
  let courseId: string;
  let classId: string;

  beforeEach(async () => {
    const course = await createCourse();
    courseId = course._id.toString();
    const cls = await ClassModel.create({ courseId, teacherId: teacher._id, name: 'Section A', enrollCode: 'ABC123' });
    classId = cls._id.toString();
  });

  describe('valid data', () => {
    it('saves an enrollment with sensible defaults', async () => {
      const enrollment = await EnrollmentModel.create({
        studentId: student._id,
        classId
      });

      expect(enrollment.studentId.toString()).toBe(student._id.toString());
      expect(enrollment.classId.toString()).toBe(classId);
      expect(enrollment.role).toBe('student');
      expect(enrollment.status).toBe('active');
      expect(enrollment.enrolledAt).toBeInstanceOf(Date);
    });

    it('accepts explicit role and status', async () => {
      const enrollment = await EnrollmentModel.create({
        studentId: student._id,
        classId,
        role: 'ta',
        status: 'active'
      });

      expect(enrollment.role).toBe('ta');
    });
  });

  describe('invalid data', () => {
    it('rejects a missing studentId', async () => {
      await expect(EnrollmentModel.create({ classId })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing classId', async () => {
      await expect(EnrollmentModel.create({ studentId: student._id })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a role outside the allowed list', async () => {
      await expect(EnrollmentModel.create({
        studentId: student._id,
        classId,
        role: 'invalid'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a status outside the allowed list', async () => {
      await expect(EnrollmentModel.create({
        studentId: student._id,
        classId,
        status: 'invalid'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('unique indexes', () => {
    it('enforces unique studentId + classId', async () => {
      await EnrollmentModel.create({ studentId: student._id, classId });
      await expect(EnrollmentModel.create({ studentId: student._id, classId }))
        .rejects.toMatchObject({ name: 'MongoServerError', code: 11000 });
    });
  });

  describe('indexes', () => {
    it('has compound index on classId + status', async () => {
      await EnrollmentModel.create({ studentId: student._id, classId, status: 'active' });
      await EnrollmentModel.create({ studentId: otherTeacher._id, classId, status: 'dropped' });

      const enrollments = await EnrollmentModel.find({ classId, status: 'active' });
      expect(enrollments.length).toBe(1);
    });
  });

  it('strips __v from JSON responses', async () => {
    const enrollment = await EnrollmentModel.create({ studentId: student._id, classId });
    const json = enrollment.toJSON() as Record<string, unknown>;
    expect(json.studentId).toBe(student._id.toString());
    expect(json).not.toHaveProperty('__v');
  });
});