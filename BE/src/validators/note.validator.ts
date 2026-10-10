// Reference module: copy this file when creating a new resource (or run `npm run gen:module <name>`).
import { z } from 'zod';
import { paginationQuerySchema, sortSchema } from '../utils/pagination';
import { booleanQuerySchema } from './common.validator';

const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(10, 'At most 10 tags')
  .transform((tags) => [...new Set(tags)]);

export const createNoteSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  content: z.string().max(5000).default(''),
  tags: tagsSchema.default([])
});

export const updateNoteSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(120),
    content: z.string().max(5000),
    tags: tagsSchema
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Send at least one field to update');

export const listNotesQuerySchema = paginationQuerySchema.extend({
  sort: sortSchema(['createdAt', 'updatedAt', 'title']),
  /** Text searched in title and content. */
  q: z.string().trim().max(100).optional(),
  tag: z.string().trim().toLowerCase().max(30).optional(),
  /** Admins only: list every user's notes. */
  all: booleanQuerySchema
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;
