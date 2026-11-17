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
import {
  useDemoCourses,
  useDemoClasses,
  useDemoCreateClass,
  useDemoUpdateClass,
  useDemoDeleteClass,
  useDemoGetClass
} from '../hooks/use-demo';
import type { DemoClass, DemoCourse, DemoResult } from '../types/demo.types';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

const classStatuses = ['planned', 'active', 'completed'] as const;

const createSchema = z.object({
  courseId: z.string().regex(new RegExp('^[a-f\\d]{24}$'), 'Invalid courseId'),
  name: z.string().trim().min(1, 'Name is required').max(100),
  schedule: z.string().max(500).optional().default(''),
  enrollCode: z.string().trim().min(6, 'Enroll code must be at least 6 characters').max(12).toUpperCase(),
  maxStudents: z.coerce.number().int().min(1).max(500).optional().default(50),
  status: z.enum(classStatuses),
});

type ClassFormValues = z.input<typeof createSchema>;

const statusVariant = (status: string) =>
  status === 'active' ? 'default' : status === 'planned' ? 'outline' : 'secondary';

interface ClassDemoSectionProps {
  onResult: (result: DemoResult) => void;
}

/** DSE-50: Class CRUD + Student Enrollment */
export const ClassDemoSection = ({ onResult }: ClassDemoSectionProps) => {
  const courses = useDemoCourses();
  const classes = useDemoClasses();
  const getClass = useDemoGetClass(onResult);
  const createClass = useDemoCreateClass(onResult);
  const updateClass = useDemoUpdateClass(onResult);
  const deleteClass = useDemoDeleteClass(onResult);
  const [pendingDelete, setPendingDelete] = useState<DemoClass | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ClassFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { courseId: '', name: '', schedule: '', enrollCode: '', maxStudents: 50, status: 'planned' }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Classes — DSE-50</CardTitle>
        <CardDescription>
          Create and manage classes. Each class has an enroll code for students to join.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {classes.isPending && <LoadingState />}
        {classes.isError && <ErrorState error={classes.error} onRetry={() => classes.refetch()} />}
        {classes.isSuccess && classes.data.items.length === 0 && (
          <EmptyState title="No classes yet" description="Create one with the form below (teacher/admin account)." />
        )}
        {classes.isSuccess &&
          (classes.data.items as DemoClass[]).map((cls: DemoClass) => (
            <div key={cls._id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{cls.name}</p>
                <div className="flex gap-1.5">
                  <Badge variant={statusVariant(cls.status)}>{cls.status}</Badge>
                  <Badge variant="outline">{cls.enrollCode}</Badge>
                  <Badge variant="outline">{cls.currentStudents ?? 0}/{cls.maxStudents}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                course: {typeof cls.courseId === 'object' ? cls.courseId.title : cls.courseId} · schedule: {cls.schedule || '—'} · created by {typeof cls.teacherId === 'object' ? cls.teacherId.email : cls.teacherId}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={getClass.isPending} onClick={() => getClass.mutate(cls._id)}>
                  Detail
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateClass.isPending}
                  onClick={() => updateClass.mutate({ id: cls._id, input: { status: 'active' } })}
                >
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateClass.isPending}
                  onClick={() => updateClass.mutate({ id: cls._id, input: { status: 'completed' } })}
                >
                  Complete
                </Button>
                <Button size="sm" variant="destructive" disabled={deleteClass.isPending} onClick={() => setPendingDelete(cls)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}

        <form className="space-y-3 rounded-lg border border-dashed p-3" onSubmit={handleSubmit((values) => {
          createClass.mutate(values);
          reset();
        })}>
          <p className="text-sm font-medium">Create class (teacher/admin)</p>
          <FormField id="demo-class-course" label="Course" error={errors.courseId?.message}>
            <select id="demo-class-course" className={selectClass} {...register('courseId')}>
              <option value="">— pick a course —</option>
              {((courses.data?.items ?? []) as DemoCourse[]).map((course: DemoCourse) => (
                <option key={course._id} value={course._id}>{course.title}</option>
              ))}
            </select>
          </FormField>
          <FormField id="demo-class-name" label="Name" error={errors.name?.message}>
            <Input id="demo-class-name" {...register('name')} />
          </FormField>
          <FormField id="demo-class-schedule" label="Schedule" error={errors.schedule?.message} hint="optional, e.g. Mon 10:00-12:00">
            <Input id="demo-class-schedule" {...register('schedule')} />
          </FormField>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField id="demo-class-enroll-code" label="Enroll code" error={errors.enrollCode?.message}>
              <Input id="demo-class-enroll-code" {...register('enrollCode')} />
            </FormField>
            <FormField id="demo-class-max-students" label="Max students" error={errors.maxStudents?.message}>
              <Input id="demo-class-max-students" type="number" {...register('maxStudents')} />
            </FormField>
            <FormField id="demo-class-status" label="Status" error={errors.status?.message}>
              <select id="demo-class-status" className={selectClass} {...register('status')}>
                <option value="planned">planned</option>
                <option value="active">active</option>
                <option value="completed">completed</option>
              </select>
            </FormField>
          </div>
          <Button type="submit" disabled={createClass.isPending}>
            Create class
          </Button>
        </form>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete "${pendingDelete?.name}"?`}
          description="DSE-50: only teachers and admins can delete classes."
          confirmLabel="Delete"
          destructive
          pending={deleteClass.isPending}
          onConfirm={() => {
            deleteClass.mutate(pendingDelete!._id);
            setPendingDelete(null);
          }}
        />
      </CardContent>
    </Card>
  );
};