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
  useDemoCourses,
  useDemoCreateCourse,
  useDemoUpdateCourse,
  useDemoDeleteCourse,
  useDemoGetCourse
} from '../hooks/use-demo';
import type { DemoCourse, DemoResult } from '../types/demo.types';

const courseStatuses = ['draft', 'published', 'archived'] as const;

const createSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
  description: z.string().max(5000),
  status: z.enum(courseStatuses)
});

const statusVariant = (status: string) =>
  status === 'published' ? 'default' : status === 'draft' ? 'outline' : 'secondary';

interface CourseDemoSectionProps {
  onResult: (result: DemoResult) => void;
}

/** DSE-49: Course CRUD (Create/Read/Update/Delete) */
export const CourseDemoSection = ({ onResult }: CourseDemoSectionProps) => {
  const courses = useDemoCourses();
  const getCourse = useDemoGetCourse(onResult);
  const createCourse = useDemoCreateCourse(onResult);
  const updateCourse = useDemoUpdateCourse(onResult);
  const deleteCourse = useDemoDeleteCourse(onResult);
  const [pendingDelete, setPendingDelete] = useState<DemoCourse | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof createSchema>>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', description: '', status: 'draft' }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Courses — DSE-49</CardTitle>
        <CardDescription>
          Create, read, update, and delete courses. All signed-in roles can read; teachers and admins can write.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {courses.isPending && <LoadingState />}
        {courses.isError && <ErrorState error={courses.error} onRetry={() => courses.refetch()} />}
        {courses.isSuccess && courses.data.items.length === 0 && (
          <EmptyState title="No courses yet" description="Create one with the form below (teacher/admin account)." />
        )}
        {courses.isSuccess &&
          (courses.data.items as DemoCourse[]).map((course: DemoCourse) => (
            <div key={course._id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{course.title}</p>
                <div className="flex gap-1.5">
                  <Badge variant={statusVariant(course.status)}>{course.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                created by {course.createdBy}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={getCourse.isPending} onClick={() => getCourse.mutate(course._id)}>
                  Detail
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateCourse.isPending}
                  onClick={() => updateCourse.mutate({ id: course._id, input: { status: 'published' } })}
                >
                  Publish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateCourse.isPending}
                  onClick={() => updateCourse.mutate({ id: course._id, input: { status: 'archived' } })}
                >
                  Archive
                </Button>
                <Button size="sm" variant="destructive" disabled={deleteCourse.isPending} onClick={() => setPendingDelete(course)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}

        <form className="space-y-3 rounded-lg border border-dashed p-3" onSubmit={handleSubmit((values) => {
          createCourse.mutate(values);
          reset();
        })}>
          <p className="text-sm font-medium">Create course (teacher/admin)</p>
          <FormField id="demo-course-title" label="Title" error={errors.title?.message}>
            <Input id="demo-course-title" {...register('title')} />
          </FormField>
          <FormField id="demo-course-description" label="Description" error={errors.description?.message}>
            <Textarea id="demo-course-description" rows={2} {...register('description')} />
          </FormField>
          <FormField id="demo-course-status" label="Status" error={errors.status?.message}>
            <select id="demo-course-status" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('status')}>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
          </FormField>
          <Button type="submit" disabled={createCourse.isPending}>
            Create course
          </Button>
        </form>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete "${pendingDelete?.title}"?`}
          description="DSE-49: only teachers and admins can delete courses — students get a 403."
          confirmLabel="Delete"
          destructive
          pending={deleteCourse.isPending}
          onConfirm={() => {
            deleteCourse.mutate(pendingDelete!._id);
            setPendingDelete(null);
          }}
        />
      </CardContent>
    </Card>
  );
};