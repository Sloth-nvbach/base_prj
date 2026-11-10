import { Request, Response } from 'express';
import * as courseService from '../services/course.service';
import * as enrollmentService from '../services/course.service';
import { CreateCourseInput, ListCoursesQuery, UpdateCourseInput, CreateClassInput, ListClassesQuery, UpdateClassInput, EnrollStudentInput, ListEnrollmentsQuery, UpdateEnrollmentInput } from '../validators/course.validator';

// `authGuard` + `requireRole` run first, so `req.user` (with role) is always set here.
const actorOf = (req: Request): courseService.Actor => ({ id: req.user!.sub, role: req.user!.role });

/** Course controllers */
export const listCourses = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListCoursesQuery;
  res.json(await courseService.listCourses(actorOf(req), query));
};

export const getCourse = async (req: Request, res: Response) => {
  res.json(await courseService.getCourse(actorOf(req), req.params.id as string));
};

export const createCourse = async (req: Request, res: Response) => {
  const course = await courseService.createCourse(actorOf(req), req.body as CreateCourseInput);
  res.status(201).json(course);
};

export const updateCourse = async (req: Request, res: Response) => {
  res.json(await courseService.updateCourse(actorOf(req), req.params.id as string, req.body as UpdateCourseInput));
};

export const deleteCourse = async (req: Request, res: Response) => {
  await courseService.deleteCourse(actorOf(req), req.params.id as string);
  res.status(204).end();
};


/** Class controllers */
export const listClasses = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListClassesQuery;
  res.json(await courseService.listClasses(actorOf(req), query));
};

export const getClass = async (req: Request, res: Response) => {
  res.json(await courseService.getClass(actorOf(req), req.params.id as string));
};

export const createClass = async (req: Request, res: Response) => {
  const cls = await courseService.createClass(actorOf(req), req.body as CreateClassInput);
  res.status(201).json(cls);
};

export const updateClass = async (req: Request, res: Response) => {
  res.json(await courseService.updateClass(actorOf(req), req.params.id as string, req.body as UpdateClassInput));
};

export const deleteClass = async (req: Request, res: Response) => {
  await courseService.deleteClass(actorOf(req), req.params.id as string);
  res.status(204).end();
};


/** Enrollment controllers */
export const listEnrollments = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListEnrollmentsQuery;
  res.json(await enrollmentService.listEnrollments(actorOf(req), query));
};

export const getEnrollment = async (req: Request, res: Response) => {
  res.json(await enrollmentService.getEnrollment(actorOf(req), req.params.id as string));
};

export const enrollStudent = async (req: Request, res: Response) => {
  const enrollment = await enrollmentService.enrollStudent(actorOf(req), req.body as EnrollStudentInput);
  res.status(201).json(enrollment);
};

export const updateEnrollment = async (req: Request, res: Response) => {
  res.json(await enrollmentService.updateEnrollment(actorOf(req), req.params.id as string, req.body as UpdateEnrollmentInput));
};

export const deleteEnrollment = async (req: Request, res: Response) => {
  await enrollmentService.deleteEnrollment(actorOf(req), req.params.id as string);
  res.status(204).end();
};