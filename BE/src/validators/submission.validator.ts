import { z } from 'zod';
import { SUBMISSION_LANGUAGES, SUBMISSION_STATUSES } from '../models/submission.model';
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

/** DSE-38: teacher review list. */
export const reviewListQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'submittedAt', 'totalScore', 'score']),
  assignment: objectIdSchema.optional(),
  status: z.enum(SUBMISSION_STATUSES).optional()
});

/** DSE-24/25: draft grade. Rubric assignments send criterionScores, others a plain score. */
export const gradeSubmissionSchema = z.object({
  criterionScores: z.record(z.string(), z.number().min(0, 'Scores cannot be negative')).optional(),
  score: z.number().min(0, 'Score cannot be negative').optional(),
  feedback: z.string().trim().max(5000).optional()
});

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
export type RunSubmissionInput = z.infer<typeof runSubmissionSchema>;
export type GetRunResultQuery = z.infer<typeof getRunResultQuerySchema>;
