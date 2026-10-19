import { z } from 'zod';
import { SUBMISSION_LANGUAGES } from '../models/submission.model';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';
import { objectIdSchema } from './common.validator';

export const createSubmissionSchema = z.object({
  assignment: objectIdSchema,
  // Whitespace-only code is rejected, but the code itself is stored untouched
  // (no trim: indentation is meaningful in Python and friends).
  code: z
    .string()
    .min(1, 'Code is required')
    .max(100000)
    .refine((value) => value.trim().length > 0, 'Code cannot be empty'),
  language: z.enum(SUBMISSION_LANGUAGES).default('javascript')
});

export const listSubmissionsQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'submittedAt']),
  /** Only submissions for this assignment. */
  assignment: objectIdSchema.optional()
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
