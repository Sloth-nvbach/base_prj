import { z } from 'zod';
import { COURSE_STATUSES } from '../models/course.model';
import { CLASS_STATUSES, ENROLLMENT_ROLES, ENROLLMENT_STATUSES } from '../models/course.model';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';

/** Course validators */
export const createCourseSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().max(5000).default(''),
  status: z.enum(COURSE_STATUSES).default('draft')
});

export const updateCourseSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    description: z.string().max(5000),
    status: z.enum(COURSE_STATUSES)
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const listCoursesQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'title', 'status']),
  status: z.enum(COURSE_STATUSES).optional()
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuerySchema>;


/** Class validators */
export const createClassSchema = z.object({
  courseId: z.string().regex(/^[a-f\d]{24}$/i, 'Invalid courseId'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  schedule: z.string().max(500).default(''),
  enrollCode: z.string().trim().min(6, 'Enroll code must be at least 6 characters').max(12).toUpperCase(),
  maxStudents: z.coerce.number().int().min(1).max(500).default(50),
  status: z.enum(CLASS_STATUSES).default('planned')
});

export const updateClassSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(100),
    schedule: z.string().max(500),
    enrollCode: z.string().trim().min(6).max(12).toUpperCase(),
    maxStudents: z.coerce.number().int().min(1).max(500),
    status: z.enum(CLASS_STATUSES)
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const listClassesQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'name', 'status']),
  courseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  teacherId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(CLASS_STATUSES).optional()
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type ListClassesQuery = z.infer<typeof listClassesQuerySchema>;


/** Enrollment validators */
export const enrollStudentSchema = z.object({
  enrollCode: z.string().trim().min(6).max(12).toUpperCase()
});

export const updateEnrollmentSchema = z
  .object({
    role: z.enum(ENROLLMENT_ROLES),
    status: z.enum(ENROLLMENT_STATUSES)
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const listEnrollmentsQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'enrolledAt', 'status']),
  classId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  studentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  status: z.enum(ENROLLMENT_STATUSES).optional(),
  role: z.enum(ENROLLMENT_ROLES).optional()
});

export type EnrollStudentInput = z.infer<typeof enrollStudentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof updateEnrollmentSchema>;
export type ListEnrollmentsQuery = z.infer<typeof listEnrollmentsQuerySchema>;