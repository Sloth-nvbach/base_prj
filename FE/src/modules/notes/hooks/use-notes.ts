// Reference module: copy this folder when creating a new feature (or run `npm run gen:module <name>`).
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notesApi } from '../api/notes.api';
import type { NoteInput, NoteListParams } from '../types/note.types';

/** Cache keys. Invalidating `noteKeys.all` refreshes every notes query. */
export const noteKeys = {
  all: ['notes'] as const,
  list: (params: NoteListParams) => [...noteKeys.all, 'list', params] as const,
  detail: (id: string) => [...noteKeys.all, 'detail', id] as const,
};

/** Paginated, filtered list. Keeps the previous page on screen while the next one loads. */
export const useNotes = (params: NoteListParams) =>
  useQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => notesApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useNote = (id: string) =>
  useQuery({ queryKey: noteKeys.detail(id), queryFn: () => notesApi.get(id) });

// Mutations: no `onError` — the shared query client toasts the backend message.

export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.create,
    onSuccess: () => {
      toast.success('Note created.');
      return queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
};

export const useUpdateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<NoteInput> }) => notesApi.update(id, input),
    onSuccess: () => {
      toast.success('Note updated.');
      return queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: notesApi.remove,
    onSuccess: () => {
      toast.success('Note deleted.');
      return queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
};
