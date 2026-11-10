import { z } from 'zod';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';

/** Individual criterion validator */
const criterionSchema = z.object({
  name: z.string().trim().min(1, 'Criterion name is required').max(100),
  description: z.string().max(1000).default(''),
  weight: z.coerce.number().min(0, 'Weight must be >= 0').max(100, 'Weight must be <= 100'),
  maxScore: z.coerce.number().int().min(1, 'Max score must be >= 1').max(100, 'Max score must be <= 100'),
  order: z.coerce.number().int().min(0).default(0)
});

/** Rubric validators */
export const createRubricSchema = z.object({
  criteria: z.array(criterionSchema).min(1, 'At least one criterion is required')
});

export const updateRubricSchema = z.object({
  criteria: z.array(criterionSchema).min(1, 'At least one criterion is required')
});

export const listRubricsQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt']),
  assignmentId: z.string().regex(/^[a-f\d]{24}$/i).optional()
});

export type CreateRubricInput = z.infer<typeof createRubricSchema>;
export type UpdateRubricInput = z.infer<typeof updateRubricSchema>;
export type ListRubricsQuery = z.infer<typeof listRubricsQuerySchema>;
export type CriterionInput = z.infer<typeof criterionSchema>;