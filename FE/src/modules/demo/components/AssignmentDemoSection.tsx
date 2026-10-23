import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { z } from 'zod';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { FormField } from '@/shared/components/form-field';
import { Input } from '@/shared/components/ui/input';
import { LoadingState } from '@/shared/components/loading-state';
import { Textarea } from '@/shared/components/ui/textarea';
import {
  useDemoAssignments,
  useDemoCheckAccess,
  useDemoCreateAssignment,
  useDemoDeleteAssignment,
  useDemoGetAssignment,
  useDemoUpdateAssignment
} from '../hooks/use-demo';
import type { DemoAssignment, DemoResult } from '../types/demo.types';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

// Strings only: the payload (numbers, the date) is built in `onSubmit`, so the
// resolver types stay simple for students reading this.
const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().max(5000),
  maxScore: z
    .string()
    .min(1, 'Max score is required')
    .refine((value) => Number(value) >= 0, 'Must be 0 or more'),
  status: z.enum(['draft', 'published']),
  dueDate: z.string().optional()
});

type CreateValues = z.infer<typeof createSchema>;

const statusVariant = (status: DemoAssignment['status']) =>
  status === 'published' ? 'default' : status === 'draft' ? 'outline' : 'secondary';

const dueLabel = (assignment: DemoAssignment) =>
  assignment.dueDate ? new Date(assignment.dueDate).toLocaleString() : 'No deadline';

interface AssignmentDemoSectionProps {
  onResult: (result: DemoResult) => void;
}

/** DSE-14/16: list every assignment the current account may see, plus the teacher actions on each row. */
export const AssignmentDemoSection = ({ onResult }: AssignmentDemoSectionProps) => {
  const assignments = useDemoAssignments();
  const getAssignment = useDemoGetAssignment(onResult);
  const createAssignment = useDemoCreateAssignment(onResult);
  const updateAssignment = useDemoUpdateAssignment(onResult);
  const deleteAssignment = useDemoDeleteAssignment(onResult);
  const checkAccess = useDemoCheckAccess(onResult);
  const [pendingDelete, setPendingDelete] = useState<DemoAssignment | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', description: '', maxScore: '100', status: 'draft', dueDate: '' }
  });

  const onCreate = handleSubmit((values) => {
    createAssignment.mutate({
      title: values.title,
      description: values.description,
      maxScore: Number(values.maxScore),
      status: values.status,
      ...(values.dueDate ? { dueDate: values.dueDate } : {})
    });
    reset();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assignments — DSE-14/16</CardTitle>
        <CardDescription>
          The list is role-aware: students see published/closed assignments of every teacher, teachers see their own
          (drafts included). Create, publish, close and delete are teacher actions — try them as a student to see the
          403.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.isPending && <LoadingState />}
        {assignments.isError && <ErrorState error={assignments.error} onRetry={() => assignments.refetch()} />}
        {assignments.isSuccess && assignments.data.items.length === 0 && (
          <EmptyState title="No assignments yet" description="Create one with the form below (teacher account)." />
        )}
        {assignments.isSuccess &&
          assignments.data.items.map((assignment) => (
            <div key={assignment._id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{assignment.title}</p>
                <div className="flex gap-1.5">
                  <Badge variant={statusVariant(assignment.status)}>{assignment.status}</Badge>
                  <Badge variant="outline">{assignment.maxScore} pts</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {dueLabel(assignment)} · created by {assignment.createdBy}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={getAssignment.isPending} onClick={() => getAssignment.mutate(assignment._id)}>
                  Detail
                </Button>
                <Button size="sm" variant="outline" disabled={checkAccess.isPending} onClick={() => checkAccess.mutate(assignment._id)}>
                  Can I submit?
                </Button>
                {assignment.status !== 'published' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateAssignment.isPending}
                    onClick={() => updateAssignment.mutate({ id: assignment._id, input: { status: 'published' } })}
                  >
                    Publish
                  </Button>
                )}
                {assignment.status === 'published' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateAssignment.isPending}
                    onClick={() => updateAssignment.mutate({ id: assignment._id, input: { status: 'closed' } })}
                  >
                    Close
                  </Button>
                )}
                <Button size="sm" variant="destructive" disabled={deleteAssignment.isPending} onClick={() => setPendingDelete(assignment)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}

        <form className="space-y-3 rounded-lg border border-dashed p-3" onSubmit={onCreate}>
          <p className="text-sm font-medium">Create assignment (teacher)</p>
          <FormField id="demo-title" label="Title" error={errors.title?.message}>
            <Input id="demo-title" {...register('title')} />
          </FormField>
          <FormField id="demo-description" label="Description" error={errors.description?.message}>
            <Textarea id="demo-description" rows={2} {...register('description')} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField id="demo-max-score" label="Max score" error={errors.maxScore?.message}>
              <Input id="demo-max-score" type="number" {...register('maxScore')} />
            </FormField>
            <FormField id="demo-status" label="Status" error={errors.status?.message}>
              <select id="demo-status" className={selectClass} {...register('status')}>
                <option value="draft">draft</option>
                <option value="published">published</option>
              </select>
            </FormField>
            <FormField id="demo-due-date" label="Due date" error={errors.dueDate?.message} hint="optional">
              <Input id="demo-due-date" type="datetime-local" {...register('dueDate')} />
            </FormField>
          </div>
          <Button type="submit" disabled={createAssignment.isPending}>
            Create assignment
          </Button>
        </form>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete "${pendingDelete?.title}"?`}
          description="DSE-14: only the teacher who created the assignment can delete it — students get a 403."
          confirmLabel="Delete"
          destructive
          pending={deleteAssignment.isPending}
          onConfirm={() => {
            deleteAssignment.mutate(pendingDelete!._id);
            setPendingDelete(null);
          }}
        />
      </CardContent>
    </Card>
  );
};
