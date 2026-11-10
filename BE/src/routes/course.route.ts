import { Router, RequestHandler } from 'express';
import { listCourses, getCourse, createCourse, updateCourse, deleteCourse } from '../controllers/course.controller';
import { listClasses, getClass, createClass, updateClass, deleteClass } from '../controllers/course.controller';
import { listEnrollments, getEnrollment, enrollStudent, updateEnrollment, deleteEnrollment } from '../controllers/course.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createCourseSchema, listCoursesQuerySchema, updateCourseSchema } from '../validators/course.validator';
import { createClassSchema, listClassesQuerySchema, updateClassSchema } from '../validators/course.validator';
import { enrollStudentSchema, listEnrollmentsQuerySchema, updateEnrollmentSchema } from '../validators/course.validator';

export const courseRouter = Router();

// Reading: all signed-in roles (students see published, teachers see own, admins see all)
// Writing: teachers and admins only
const read: RequestHandler[] = [authGuard, requireRole('student', 'teacher', 'admin')];
const write: RequestHandler[] = [authGuard, requireRole('teacher', 'admin')];

/** Course routes */
courseRouter.get('/courses', ...read, validate({ query: listCoursesQuerySchema }), listCourses);
courseRouter.get('/courses/:id', ...read, validate({ params: idParamsSchema }), getCourse);
courseRouter.post('/courses', ...write, validate({ body: createCourseSchema }), createCourse);
courseRouter.patch('/courses/:id', ...write, validate({ params: idParamsSchema, body: updateCourseSchema }), updateCourse);
courseRouter.delete('/courses/:id', ...write, validate({ params: idParamsSchema }), deleteCourse);

/** Class routes */
courseRouter.get('/classes', ...read, validate({ query: listClassesQuerySchema }), listClasses);
courseRouter.get('/classes/:id', ...read, validate({ params: idParamsSchema }), getClass);
courseRouter.post('/classes', ...write, validate({ body: createClassSchema }), createClass);
courseRouter.patch('/classes/:id', ...write, validate({ params: idParamsSchema, body: updateClassSchema }), updateClass);
courseRouter.delete('/classes/:id', ...write, validate({ params: idParamsSchema }), deleteClass);

/** Enrollment routes */
courseRouter.get('/enrollments', ...read, validate({ query: listEnrollmentsQuerySchema }), listEnrollments);
courseRouter.get('/enrollments/:id', ...read, validate({ params: idParamsSchema }), getEnrollment);
// Students enroll themselves via enroll code
courseRouter.post('/enrollments', ...read, validate({ body: enrollStudentSchema }), enrollStudent);
// Students can update their own enrollment (e.g., drop), teachers/admins manage all
courseRouter.patch('/enrollments/:id', ...read, validate({ params: idParamsSchema, body: updateEnrollmentSchema }), updateEnrollment);
courseRouter.delete('/enrollments/:id', ...read, validate({ params: idParamsSchema }), deleteEnrollment);