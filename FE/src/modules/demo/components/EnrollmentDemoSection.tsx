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
  useDemoEnrollments,
  useDemoEnrollStudent,
  useDemoUpdateEnrollment,
  useDemoDeleteEnrollment
} from '../hooks/use-demo';
import type { DemoEnrollment, DemoResult } from '../types/demo.types';

const enrollSchema = z.object({
  enrollCode: z.string().trim().min(6, 'Enroll code is required').max(12).toUpperCase()
});

const roleVariant = (role: string) => role === 'ta' ? 'default' : 'secondary';
const statusVariant = (status: string) =>
  status === 'active' ? 'default' : status === 'dropped' ? 'destructive' : 'secondary';

interface EnrollmentDemoSectionProps {
  onResult: (result: DemoResult) => void;
}

/** DSE-50: Student Enrollment */
export const EnrollmentDemoSection = ({ onResult }: EnrollmentDemoSectionProps) => {
  const enrollments = useDemoEnrollments();
  const enrollStudent = useDemoEnrollStudent(onResult);
  const updateEnrollment = useDemoUpdateEnrollment(onResult);
  const deleteEnrollment = useDemoDeleteEnrollment(onResult);
  const [pendingDelete, setPendingDelete] = useState<DemoEnrollment | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof enrollSchema>>({
    resolver: zodResolver(enrollSchema),
    defaultValues: { enrollCode: '' }
  });

  const onEnroll = handleSubmit((values) => {
    enrollStudent.mutate(values);
    reset();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Enrollments — DSE-50</CardTitle>
        <CardDescription>
          Students enroll themselves using the class enroll code. Teachers/admins can manage enrollments.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3 rounded-lg border border-dashed p-3" onSubmit={onEnroll}>
          <p className="text-sm font-medium">Enroll in a class (student)</p>
          <FormField id="demo-enroll-code" label="Enroll code" error={errors.enrollCode?.message}>
            <Input id="demo-enroll-code" {...register('enrollCode')} placeholder="ABC123" />
          </FormField>
          <Button type="submit" disabled={enrollStudent.isPending}>
            Enroll me
          </Button>
        </form>

        {enrollments.isPending && <LoadingState />}
        {enrollments.isError && <ErrorState error={enrollments.error} onRetry={() => enrollments.refetch()} />}
        {enrollments.isSuccess && enrollments.data.items.length === 0 && (
          <EmptyState title="No enrollments yet" description="Enroll in a class above using an enroll code." />
        )}
        {enrollments.isSuccess &&
          (enrollments.data.items as DemoEnrollment[]).map((enrollment: DemoEnrollment) => (
            <div key={enrollment._id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{typeof enrollment.classId === 'object' ? enrollment.classId.name : enrollment.classId}</p>
                <div className="flex gap-1.5">
                  <Badge variant={roleVariant(enrollment.role)}>{enrollment.role}</Badge>
                  <Badge variant={statusVariant(enrollment.status)}>{enrollment.status}</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                student: {typeof enrollment.studentId === 'object' ? (enrollment.studentId as { email: string }).email : enrollment.studentId} · enrolled: {new Date(enrollment.enrolledAt).toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-2">
                {enrollment.status === 'active' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateEnrollment.isPending}
                    onClick={() => updateEnrollment.mutate({ id: enrollment._id, input: { status: 'dropped' } })}
                  >
                    Drop
                  </Button>
                )}
                {enrollment.status !== 'completed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updateEnrollment.isPending}
                    onClick={() => updateEnrollment.mutate({ id: enrollment._id, input: { status: 'completed' } })}
                  >
                    Complete
                  </Button>
                )}
                <Button size="sm" variant="destructive" disabled={deleteEnrollment.isPending} onClick={() => setPendingDelete(enrollment)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete enrollment of ${typeof pendingDelete?.studentId === 'object' ? (pendingDelete.studentId as { email: string }).email : pendingDelete?.studentId}?`}
          description="DSE-50: students can drop themselves; teachers/admins manage all."
          confirmLabel="Delete"
          destructive
          pending={deleteEnrollment.isPending}
          onConfirm={() => {
            deleteEnrollment.mutate(pendingDelete!._id);
            setPendingDelete(null);
          }}
        />
      </CardContent>
    </Card>
  );
};