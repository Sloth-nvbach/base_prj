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
  useDemoRubrics,
  useDemoAssignments,
  useDemoGetRubric,
  useDemoGetRubricByAssignment,
  useDemoGetDefaultRubric,
  useDemoCreateOrUpdateRubric,
  useDemoUpdateRubric,
  useDemoDeleteRubric
} from '../hooks/use-demo';
import type { DemoAssignment, DemoResult, DemoRubric } from '../types/demo.types';

const criterionSchema = z.object({
  name: z.string().trim().min(1, 'Criterion name is required').max(100),
  description: z.string().max(1000).default(''),
  weight: z.coerce.number().min(0, 'Weight must be >= 0').max(100, 'Weight must be <= 100'),
  maxScore: z.coerce.number().int().min(1, 'Max score must be >= 1').max(100, 'Max score must be <= 100'),
  order: z.coerce.number().int().min(0).default(0)
});

const rubricSchema = z.object({
  assignmentId: z.string().regex(new RegExp('^[a-f\\d]{24}$'), 'Invalid assignmentId'),
  criteria: z.array(criterionSchema).min(1, 'At least one criterion is required')
});

type RubricFormValues = z.input<typeof rubricSchema>;

interface RubricDemoSectionProps {
  onResult: (result: DemoResult) => void;
}

/** DSE-51: Rubric CRUD */
export const RubricDemoSection = ({ onResult }: RubricDemoSectionProps) => {
  const assignments = useDemoAssignments();
  const rubrics = useDemoRubrics();
  const getRubric = useDemoGetRubric(onResult);
  const getRubricByAssignment = useDemoGetRubricByAssignment(onResult);
  const getDefaultRubric = useDemoGetDefaultRubric(onResult);
  const createOrUpdateRubric = useDemoCreateOrUpdateRubric(onResult);
  const updateRubric = useDemoUpdateRubric(onResult);
  const deleteRubric = useDemoDeleteRubric(onResult);
  const [pendingDelete, setPendingDelete] = useState<DemoRubric | null>(null);
  const [editingRubric, setEditingRubric] = useState<DemoRubric | null>(null);

  const { register, formState: { errors }, reset, watch, setValue } = useForm<RubricFormValues>({
    resolver: zodResolver(rubricSchema),
    defaultValues: { assignmentId: '', criteria: [{ name: '', description: '', weight: 0, maxScore: 10, order: 0 }] }
  });

  const criteria = watch('criteria') as Array<{ name: string; description: string; weight: number; maxScore: number; order: number }>;

  const addCriterion = () => {
    setValue('criteria', [...criteria, { name: '', description: '', weight: 0, maxScore: 10, order: criteria.length }]);
  };

  const removeCriterion = (index: number) => {
    setValue('criteria', criteria.filter((_, i) => i !== index));
  };

  const totalWeight = criteria.reduce((sum, c) => sum + (c.weight || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rubrics — DSE-51</CardTitle>
        <CardDescription>
          Create and manage grading rubrics per assignment. Weights auto-normalize to 100%.
          <br />Use "Get by Assignment" to load an existing rubric for editing.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rubrics.isPending && <LoadingState />}
        {rubrics.isError && <ErrorState error={rubrics.error} onRetry={() => rubrics.refetch()} />}
        {rubrics.isSuccess && rubrics.data.items.length === 0 && (
          <EmptyState title="No rubrics yet" description="Create one below (teacher/admin account)." />
        )}
        {rubrics.isSuccess &&
          (rubrics.data.items as DemoRubric[]).map((rubric: DemoRubric) => (
            <div key={rubric._id} className="space-y-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">Rubric for assignment: {typeof rubric.assignmentId === 'object' ? rubric.assignmentId.title : rubric.assignmentId}</p>
                <div className="flex gap-1.5">
                  <Badge variant="outline">{rubric.criteria?.length ?? 0} criteria</Badge>
                  <Badge variant="outline">Σ weight: {rubric.criteria?.reduce((s: number, c: { weight?: number }) => s + (c.weight || 0), 0)}%</Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={getRubric.isPending} onClick={() => getRubric.mutate(rubric._id)}>
                  Get by ID
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={updateRubric.isPending}
                  onClick={() => {
                    setEditingRubric(rubric);
                    setValue('criteria', rubric.criteria || []);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="destructive" disabled={deleteRubric.isPending} onClick={() => setPendingDelete(rubric)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}

        <div className="rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium mb-3">
            {editingRubric ? 'Edit rubric' : 'Create/Update rubric for assignment (teacher/admin)'}
          </p>

          <FormField id="demo-rubric-assignment" label="Assignment" error={errors.assignmentId?.message}>
            <select id="demo-rubric-assignment" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...register('assignmentId')}>
              <option value="">— pick an assignment —</option>
              {(assignments.data?.items ?? []).map((assignment: DemoAssignment) => (
                <option key={assignment._id} value={assignment._id}>{assignment.title}</option>
              ))}
            </select>
          </FormField>

          <div className="space-y-3 mt-3">
            {criteria.map((_criterion, index) => (
              <div key={index} className="rounded-lg border p-3 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Criterion {index + 1}</span>
                  {criteria.length > 1 && (
                    <Button type="button" size="sm" variant="ghost" onClick={() => removeCriterion(index)}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <FormField id={`demo-criterion-${index}-name`} label="Name" error={errors.criteria?.[index]?.name?.message}>
                    <Input {...register(`criteria.${index}.name`)} placeholder="e.g. Correctness" />
                  </FormField>
                  <FormField id={`demo-criterion-${index}-weight`} label="Weight" error={errors.criteria?.[index]?.weight?.message}>
                    <Input type="number" min={0} max={100} {...register(`criteria.${index}.weight`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField id={`demo-criterion-${index}-maxScore`} label="Max score" error={errors.criteria?.[index]?.maxScore?.message}>
                    <Input type="number" min={1} max={100} {...register(`criteria.${index}.maxScore`, { valueAsNumber: true })} />
                  </FormField>
                  <FormField id={`demo-criterion-${index}-order`} label="Order" error={errors.criteria?.[index]?.order?.message}>
                    <Input type="number" min={0} {...register(`criteria.${index}.order`, { valueAsNumber: true })} />
                  </FormField>
                </div>
                <FormField id={`demo-criterion-${index}-description`} label="Description" error={errors.criteria?.[index]?.description?.message}>
                  <Input {...register(`criteria.${index}.description`)} placeholder="Optional description" />
                </FormField>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <Badge variant={totalWeight === 100 ? 'default' : totalWeight > 100 ? 'destructive' : 'outline'}>
              Total weight: {totalWeight}%
            </Badge>
            <Button type="button" variant="outline" size="sm" onClick={addCriterion} disabled={criteria.length >= 10}>
              + Add criterion
            </Button>
          </div>

          <div className="flex gap-2 mt-3">
            <Button type="button" variant="outline" onClick={() => getDefaultRubric.mutate()}>
              Get default template
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              const formState = document.getElementById('demo-rubric-assignment') as HTMLSelectElement;
              const assignmentId = formState?.value || (assignments.data?.items?.[0]?._id);
              if (assignmentId) getRubricByAssignment.mutate(assignmentId);
            }}>
              Get by assignment
            </Button>
            <div className="flex-1" />
            {editingRubric ? (
              <>
                <Button type="button" variant="ghost" onClick={() => { setEditingRubric(null); reset({ criteria: [{ name: '', description: '', weight: 0, maxScore: 10, order: 0 }] }); }}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createOrUpdateRubric.isPending}>
                  Update rubric
                </Button>
              </>
            ) : (
              <Button type="submit" disabled={createOrUpdateRubric.isPending}>
                Create rubric
              </Button>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={Boolean(pendingDelete)}
          onOpenChange={(open) => !open && setPendingDelete(null)}
          title={`Delete rubric for "${typeof pendingDelete?.assignmentId === 'object' ? pendingDelete.assignmentId.title : pendingDelete?.assignmentId}"?`}
          description="DSE-51: only teachers and admins can delete rubrics."
          confirmLabel="Delete"
          destructive
          pending={deleteRubric.isPending}
          onConfirm={() => {
            deleteRubric.mutate(pendingDelete!._id);
            setPendingDelete(null);
          }}
        />
      </CardContent>
    </Card>
  );
};