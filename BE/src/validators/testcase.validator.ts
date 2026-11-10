import { z } from 'zod';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';

/** TestCase validators */
export const createTestCaseSchema = z.object({
  input: z.string().min(1, 'Input is required').max(10000),
  expectedOutput: z.string().min(1, 'Expected output is required').max(10000),
  isHidden: z.boolean().default(false),
  order: z.number().int().min(0).optional(),
  points: z.coerce.number().int().min(1, 'Points must be >= 1').max(100, 'Points must be <= 100')
});

export const updateTestCaseSchema = z
  .object({
    input: z.string().min(1).max(10000),
    expectedOutput: z.string().min(1).max(10000),
    isHidden: z.boolean(),
    order: z.number().int().min(0).optional(),
    points: z.coerce.number().int().min(1).max(100)
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const listTestCasesQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['order', 'createdAt', 'updatedAt']),
  assignmentId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  isHidden: z.enum(['true', 'false']).optional().transform((value) => value === 'true')
});

export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
export type ListTestCasesQuery = z.infer<typeof listTestCasesQuerySchema>;


/** TestResult validators (read-only, created by grading system) */
export const listTestResultsQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt']),
  submissionId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  testCaseId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  passed: z.enum(['true', 'false']).optional().transform((value) => value === 'true')
});

export type ListTestResultsQuery = z.infer<typeof listTestResultsQuerySchema>;