import { z } from 'zod';
import { ASSIGNMENT_STATUSES } from '../models/assignment.model';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';

export const createAssignmentSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().max(5000).default(''),
  instructions: z.string().max(10000).default(''),
  /** ISO date string; `null` ("no deadline") is normalized away — just omit it. */
  dueDate: z
    .coerce.date()
    .nullable()
    .optional()
    .transform((value) => value ?? undefined),
  maxScore: z.coerce.number().min(0).default(100),
  status: z.enum(ASSIGNMENT_STATUSES).default('draft')
});

export const updateAssignmentSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    description: z.string().max(5000),
    instructions: z.string().max(10000),
    /** null clears the deadline. */
    dueDate: z.coerce.date().nullable(),
    maxScore: z.coerce.number().min(0),
    status: z.enum(ASSIGNMENT_STATUSES)
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const listAssignmentsQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'title', 'dueDate', 'maxScore'])
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type ListAssignmentsQuery = z.infer<typeof listAssignmentsQuerySchema>;
