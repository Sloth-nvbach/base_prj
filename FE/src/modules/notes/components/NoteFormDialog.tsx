// Reference module: copy this folder when creating a new feature (or run `npm run gen:module <name>`).
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/shared/components/form-field';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useCreateNote, useUpdateNote } from '../hooks/use-notes';
import type { Note } from '../types/note.types';

// Mirrors `createNoteSchema` in BE/src/validators/note.validator.ts.
const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120, 'Max 120 characters'),
  content: z.string().max(5000, 'Max 5000 characters'),
  // Typed as "math, homework" and sent as ['math', 'homework'].
  tags: z.string().transform((value) =>
    value
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
  ),
});

type FormValues = z.input<typeof schema>;
type SubmitValues = z.output<typeof schema>;

interface NoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this note; leave empty to create a new one. */
  note?: Note;
}

const toFormValues = (note?: Note): FormValues => ({
  title: note?.title ?? '',
  content: note?.content ?? '',
  tags: note?.tags.join(', ') ?? '',
});

/**
 * Create / edit form in a dialog. Mount it with a `key` per note so the form
 * resets when switching between notes.
 */
export const NoteFormDialog = ({ open, onOpenChange, note }: NoteFormDialogProps) => {
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const saving = createNote.isPending || updateNote.isPending;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues, unknown, SubmitValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(note),
  });

  const onSubmit = handleSubmit(async (input) => {
    if (note) await updateNote.mutateAsync({ id: note._id, input });
    else await createNote.mutateAsync(input);
    reset(toFormValues());
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? 'Edit note' : 'New note'}</DialogTitle>
        </DialogHeader>

        {/* `.catch` keeps a failed request from becoming an unhandled rejection; the toast already explains it. */}
        <form className="space-y-4" onSubmit={(event) => void onSubmit(event).catch(() => undefined)}>
          <FormField id="note-title" label="Title" error={errors.title?.message}>
            <Input id="note-title" autoFocus {...register('title')} />
          </FormField>

          <FormField id="note-content" label="Content" error={errors.content?.message}>
            <Textarea id="note-content" rows={6} {...register('content')} />
          </FormField>

          <FormField id="note-tags" label="Tags" hint="Comma separated" error={errors.tags?.message}>
            <Input id="note-tags" placeholder="math, homework" {...register('tags')} />
          </FormField>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {note ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
