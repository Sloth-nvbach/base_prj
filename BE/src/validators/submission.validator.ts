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

/** Run submission input (currently empty - uses submission's code, but extensible for overrides). */
export const runSubmissionSchema = z.object({}).strict();

/** Query params for getting run result. */
export const getRunResultQuerySchema = z.object({
  jobId: z.string().min(1, 'jobId is required')
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type RunSubmissionInput = z.infer<typeof runSubmissionSchema>;
export type GetRunResultQuery = z.infer<typeof getRunResultQuerySchema>;
