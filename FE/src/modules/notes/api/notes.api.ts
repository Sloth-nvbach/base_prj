// Reference module: copy this folder when creating a new feature (or run `npm run gen:module <name>`).
import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { Note, NoteInput, NoteListParams } from '../types/note.types';

/** Drops empty values so the URL stays clean (`?q=` is never sent). */
const cleanParams = (params: NoteListParams) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== '' && value !== false));

/** Every function resolves with the response body (not the Axios response). */
export const notesApi = {
  list: (params: NoteListParams = {}) =>
    http.get<Paginated<Note>>('/notes', { params: cleanParams(params) }).then((r) => r.data),
  get: (id: string) => http.get<Note>(`/notes/${id}`).then((r) => r.data),
  create: (input: NoteInput) => http.post<Note>('/notes', input).then((r) => r.data),
  update: (id: string, input: Partial<NoteInput>) => http.patch<Note>(`/notes/${id}`, input).then((r) => r.data),
  remove: (id: string) => http.delete(`/notes/${id}`).then(() => undefined),
};
