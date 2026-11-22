import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { FormField } from '@/shared/components/form-field';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useUpdateAssignment } from '../hooks/use-assignments';
import { ASSIGNMENT_STATUSES, type Assignment } from '../types/assignment.types';

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().trim().max(5000),
  instructions: z.string().trim().max(10000),
  dueDate: z.string(),
  maxScore: z.coerce.number({ message: 'Enter a number' }).min(0, 'Cannot be negative'),
  status: z.enum(ASSIGNMENT_STATUSES),
});

/** `datetime-local` wants local time without seconds or zone. */
const toLocalInput = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

/** Details tab: edit title, problem text, deadline, max score and status. */
export const AssignmentDetailsForm = ({ assignment }: { assignment: Assignment }) => {
  const update = useUpdateAssignment();
  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: assignment.title,
      description: assignment.description ?? '',
      instructions: assignment.instructions ?? '',
      dueDate: toLocalInput(assignment.dueDate),
      maxScore: assignment.maxScore,
      status: assignment.status,
    },
  });

  const save = handleSubmit((values) =>
    update.mutate({
      id: assignment._id,
      input: { ...values, dueDate: values.dueDate ? new Date(values.dueDate).toISOString() : null },
    }),
  );

  return (
    <form onSubmit={save} className="space-y-4" aria-label="Assignment details">
      <FormField id="assignment-title" label="Title" error={errors.title?.message}>
        <Input id="assignment-title" {...register('title')} />
      </FormField>
      <FormField id="assignment-description" label="Short description" error={errors.description?.message}>
        <Textarea id="assignment-description" rows={2} {...register('description')} />
      </FormField>
      <FormField id="assignment-instructions" label="Instructions (shown to students and to the AI reviewer)" error={errors.instructions?.message}>
        <Textarea id="assignment-instructions" rows={8} {...register('instructions')} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField id="assignment-due" label="Due date" error={errors.dueDate?.message}>
          <Input id="assignment-due" type="datetime-local" {...register('dueDate')} />
        </FormField>
        <FormField id="assignment-max" label="Max score" error={errors.maxScore?.message}>
          <Input id="assignment-max" type="number" {...register('maxScore')} />
        </FormField>
        <FormField id="assignment-status" label="Status" error={errors.status?.message}>
          <select id="assignment-status" className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('status')}>
            {ASSIGNMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={update.isPending}>
          {update.isPending ? 'Saving…' : 'Save details'}
        </Button>
      </div>
    </form>
  );
};
