import type { QueryFilter } from 'mongoose';
import { CourseDocument, CourseModel, ClassDocument, ClassModel, EnrollmentDocument, EnrollmentModel } from '../models/course.model';
import { notFound, badRequest, conflict } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateCourseInput, ListCoursesQuery, UpdateCourseInput, CreateClassInput, ListClassesQuery, UpdateClassInput, EnrollStudentInput, ListEnrollmentsQuery, UpdateEnrollmentInput } from '../validators/course.validator';

/** Who is making the request. */
export interface Actor {
  id: string;
  role?: string;
}

const isAdmin = (actor: Actor) => actor.role === 'admin';
const isTeacher = (actor: Actor) => actor.role === 'teacher';

/**
 * Filter limiting a read to the courses the actor may see.
 * - Admins see everything
 * - Teachers see their own courses
 * - Students see published and archived courses
 */
const courseReadFilter = (actor: Actor): QueryFilter<CourseDocument> => {
  if (isAdmin(actor)) return {};
  if (isTeacher(actor)) return { createdBy: actor.id };
  return { status: { $in: ['published', 'archived'] } };
};

/** Filter for writes (update, delete). Teachers may touch their own courses only. */
const courseWriteFilter = (actor: Actor, id?: string) => ({
  ...(id ? { _id: id } : {}),
  ...(isAdmin(actor) ? {} : { createdBy: actor.id })
});

export const listCourses = (actor: Actor, pagination: ListCoursesQuery) =>
  paginate(CourseModel, courseReadFilter(actor), pagination);

export const getCourse = async (actor: Actor, id: string) => {
  const course = await CourseModel.findOne({ ...courseReadFilter(actor), _id: id });
  if (!course) throw notFound('Course not found');
  return course;
};

export const createCourse = (actor: Actor, input: CreateCourseInput) =>
  CourseModel.create({ ...input, createdBy: actor.id });

export const updateCourse = async (actor: Actor, id: string, input: UpdateCourseInput) => {
  const course = await CourseModel.findOneAndUpdate(courseWriteFilter(actor, id), input, {
    returnDocument: 'after',
    runValidators: true
  });
  if (!course) throw notFound('Course not found');
  return course;
};

export const deleteCourse = async (actor: Actor, id: string) => {
  const course = await CourseModel.findOneAndDelete(courseWriteFilter(actor, id));
  if (!course) throw notFound('Course not found');
  return course;
};


/**
 * Filter limiting a read to the classes the actor may see.
 * - Admins see everything
 * - Teachers see their own classes
 * - Students see classes they're enrolled in (active enrollments)
 */
const classReadFilter = async (actor: Actor): Promise<QueryFilter<ClassDocument>> => {
  if (isAdmin(actor)) return {};
  if (isTeacher(actor)) return { teacherId: actor.id };

  // Student: find classes where they have active enrollment
  const enrollmentClassIds = await EnrollmentModel.find({
    studentId: actor.id,
    status: 'active'
  }).distinct('classId');

  return { _id: { $in: enrollmentClassIds }, status: { $in: ['planned', 'active'] } };
};

/** Filter for writes (update, delete). Teachers may touch their own classes only. */
const classWriteFilter = (actor: Actor, id?: string) => ({
  ...(id ? { _id: id } : {}),
  ...(isAdmin(actor) ? {} : { teacherId: actor.id })
});

export const listClasses = async (actor: Actor, pagination: ListClassesQuery) => {
  const filter = await classReadFilter(actor);

  // Apply additional query filters
  if (pagination.courseId) filter.courseId = pagination.courseId;
  if (pagination.teacherId && isAdmin(actor)) filter.teacherId = pagination.teacherId;
  if (pagination.status) filter.status = pagination.status;

  return paginate(ClassModel, filter, pagination);
};

export const getClass = async (actor: Actor, id: string) => {
  const filter = await classReadFilter(actor);
  const cls = await ClassModel.findOne({ ...filter, _id: id });
  if (!cls) throw notFound('Class not found');
  return cls;
};

export const createClass = async (actor: Actor, input: CreateClassInput) => {
  // Verify course exists and actor owns it (or is admin)
  const course = await CourseModel.findById(input.courseId);
  if (!course) throw notFound('Course not found');
  if (!isAdmin(actor) && course.createdBy.toString() !== actor.id) {
    throw notFound('Course not found');
  }

  // Check if enrollCode is unique
  const existing = await ClassModel.exists({ enrollCode: input.enrollCode });
  if (existing) throw conflict('Enroll code already in use');

  return ClassModel.create({ ...input, teacherId: actor.id });
};

export const updateClass = async (actor: Actor, id: string, input: UpdateClassInput) => {
  // If enrollCode is being updated, check uniqueness
  if (input.enrollCode) {
    const existing = await ClassModel.findOne({ enrollCode: input.enrollCode, _id: { $ne: id } });
    if (existing) throw conflict('Enroll code already in use');
  }

  const cls = await ClassModel.findOneAndUpdate(classWriteFilter(actor, id), input, {
    returnDocument: 'after',
    runValidators: true
  });
  if (!cls) throw notFound('Class not found');
  return cls;
};

export const deleteClass = async (actor: Actor, id: string) => {
  const cls = await ClassModel.findOneAndDelete(classWriteFilter(actor, id));
  if (!cls) throw notFound('Class not found');
  return cls;
};


/** Enrollment read filter */
const enrollmentReadFilter = (actor: Actor): QueryFilter<EnrollmentDocument> => {
  if (isAdmin(actor)) return {};
  if (isTeacher(actor)) return {}; // Teachers can see all enrollments in their classes (filtered by classId query)
  return { studentId: actor.id }; // Students see only their own enrollments
};

export const listEnrollments = async (actor: Actor, pagination: ListEnrollmentsQuery) => {
  const filter = enrollmentReadFilter(actor);

  if (pagination.classId) filter.classId = pagination.classId;
  if (pagination.studentId && isAdmin(actor)) filter.studentId = pagination.studentId;
  if (pagination.status) filter.status = pagination.status;
  if (pagination.role) filter.role = pagination.role;

  return paginate(EnrollmentModel, filter, pagination);
};

export const getEnrollment = async (actor: Actor, id: string) => {
  const enrollment = await EnrollmentModel.findOne({ ...enrollmentReadFilter(actor), _id: id });
  if (!enrollment) throw notFound('Enrollment not found');
  return enrollment;
};

export const enrollStudent = async (actor: Actor, input: EnrollStudentInput) => {
  // Student can only enroll themselves
  const studentId = actor.id;

  // Find class by enrollCode
  const cls = await ClassModel.findOne({ enrollCode: input.enrollCode });
  if (!cls) throw notFound('Invalid enroll code');

  // Check class status
  if (cls.status !== 'planned' && cls.status !== 'active') {
    throw badRequest('Cannot enroll in this class');
  }

  // Check max students
  const activeCount = await EnrollmentModel.countDocuments({ classId: cls._id, status: 'active' });
  if (activeCount >= cls.maxStudents) {
    throw badRequest('Class is full');
  }

  // Check if already enrolled
  const existing = await EnrollmentModel.findOne({ studentId, classId: cls._id });
  if (existing) {
    if (existing.status === 'active') throw conflict('Already enrolled in this class');
    // Reactivate dropped enrollment
    existing.status = 'active';
    existing.enrolledAt = new Date();
    return existing.save();
  }

  return EnrollmentModel.create({
    studentId,
    classId: cls._id,
    role: 'student',
    status: 'active',
    enrolledAt: new Date()
  });
};

export const updateEnrollment = async (actor: Actor, id: string, input: UpdateEnrollmentInput) => {
  const enrollment = await EnrollmentModel.findById(id);
  if (!enrollment) throw notFound('Enrollment not found');

  // Teachers can update enrollments in their classes
  if (isTeacher(actor)) {
    const cls = await ClassModel.findById(enrollment.classId);
    if (!cls || cls.teacherId.toString() !== actor.id) {
      throw notFound('Enrollment not found');
    }
  }
  // Students can only update their own enrollment status to 'dropped'
  else if (!isAdmin(actor)) {
    if (enrollment.studentId.toString() !== actor.id) throw notFound('Enrollment not found');
    if (input.role) throw badRequest('Students cannot change role');
    if (input.status && input.status !== 'dropped') throw badRequest('Students can only drop enrollment');
  }

  Object.assign(enrollment, input);
  return enrollment.save();
};

export const deleteEnrollment = async (actor: Actor, id: string) => {
  const enrollment = await EnrollmentModel.findById(id);
  if (!enrollment) throw notFound('Enrollment not found');

  // Teachers can delete enrollments in their classes
  if (isTeacher(actor)) {
    const cls = await ClassModel.findById(enrollment.classId);
    if (!cls || cls.teacherId.toString() !== actor.id) {
      throw notFound('Enrollment not found');
    }
  }
  // Students can only drop their own enrollment (set status to dropped)
  else if (!isAdmin(actor)) {
    if (enrollment.studentId.toString() !== actor.id) throw notFound('Enrollment not found');
    enrollment.status = 'dropped';
    return enrollment.save();
  }

  await enrollment.deleteOne();
  return enrollment;
};