import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, GripVertical, Copy, Download, Upload, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Label } from '@/shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Progress } from '@/shared/components/ui/progress';
import { useRubricByAssignment, useCreateOrUpdateRubric, useDefaultRubric, useCopyRubric } from '../hooks/use-rubrics';
import { useAssignments } from '@/modules/assignment/hooks/use-assignments';
import type { Criterion, CriterionInput } from '../types/rubric.types';
import { cn } from '@/shared/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RubricBuilderProps {
  assignmentId: string;
  isTeacherOrAdmin: boolean;
}

interface SortableCriterionProps {
  criterion: Criterion;
  index: number;
  onUpdate: (id: string, input: Partial<CriterionInput>) => void;
  onDelete: (id: string) => void;
  isEditing: boolean;
  onEdit: () => void;
  disabled: boolean;
}

const SortableCriterion = ({
  criterion,
  index,
  onUpdate,
  onDelete,
  isEditing,
  onEdit,
  disabled,
}: SortableCriterionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: criterion._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 bg-card"
    >
      <div className="flex items-start gap-3">
        <div
          {...attributes}
          {...listeners}
          className="flex flex-col items-center gap-1 text-muted-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="size-5 opacity-50 hover:opacity-100" />
          <span className="text-sm font-medium">{index + 1}</span>
        </div>
        <div className="flex-1 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor={`criterion-name-${criterion._id}`}>Name</Label>
              <Input
                id={`criterion-name-${criterion._id}`}
                value={criterion.name}
                onChange={(e) => onUpdate(criterion._id, { name: e.target.value })}
                disabled={disabled}
              />
            </div>
            <div>
              <Label htmlFor={`criterion-maxScore-${criterion._id}`}>Max Score</Label>
              <Input
                id={`criterion-maxScore-${criterion._id}`}
                type="number"
                min="1"
                max="100"
                value={criterion.maxScore}
                onChange={(e) => onUpdate(criterion._id, { maxScore: parseInt(e.target.value) || 1 })}
                disabled={disabled}
              />
            </div>
          </div>
          <div>
            <Label htmlFor={`criterion-weight-${criterion._id}`}>Weight (%)</Label>
            <Input
              id={`criterion-weight-${criterion._id}`}
              type="number"
              min="0"
              max="100"
              value={criterion.weight}
              onChange={(e) => onUpdate(criterion._id, { weight: parseInt(e.target.value) || 0 })}
              disabled={disabled}
            />
          </div>
          <div>
            <Label htmlFor={`criterion-desc-${criterion._id}`}>Description</Label>
            <Textarea
              id={`criterion-desc-${criterion._id}`}
              value={criterion.description}
              onChange={(e) => onUpdate(criterion._id, { description: e.target.value })}
              rows={2}
              disabled={disabled}
            />
          </div>
          {!disabled && (
            <div className="flex items-center gap-2 pt-2 border-t">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                {isEditing ? 'Done' : 'Edit'}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => onDelete(criterion._id)}>
                <Trash2 className="size-4 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const RubricBuilder = ({ assignmentId, isTeacherOrAdmin }: RubricBuilderProps) => {
  const { data: rubric, isLoading, refetch } = useRubricByAssignment(assignmentId);
  const createOrUpdate = useCreateOrUpdateRubric();
  const { data: defaultRubric } = useDefaultRubric();
  const copyRubric = useCopyRubric();
  const { data: assignments } = useAssignments({ limit: 100 });

  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [sourceAssignmentId, setSourceAssignmentId] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize criteria from rubric data
  const isInitialized = React.useRef(false);
  useEffect(() => {
    if (rubric?.criteria && !isInitialized.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCriteria(rubric.criteria);
      isInitialized.current = true;
    }
  }, [rubric]);

  // Calculate total weight
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  const isWeightValid = totalWeight === 100;

  const handleUpdateCriterion = useCallback((id: string, updates: Partial<CriterionInput>) => {
    setCriteria((prev) =>
      prev.map((c) => (c._id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const handleAddCriterion = () => {
    const newCriterion: Criterion = {
      _id: `temp-${Date.now()}`,
      name: '',
      description: '',
      weight: 0,
      maxScore: 100,
      order: criteria.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setCriteria((prev) => [...prev, newCriterion]);
  };

  const handleDeleteCriterion = (id: string) => {
    setCriteria((prev) => prev.filter((c) => c._id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setCriteria((prev) => {
        const oldIndex = prev.findIndex((c) => c._id === active.id);
        const newIndex = prev.findIndex((c) => c._id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const handleSave = async () => {
    if (criteria.length === 0) {
      toast.error('At least one criterion is required');
      return;
    }
    if (!isWeightValid) {
      toast.error('Total weight must equal 100%');
      return;
    }
    const hasDuplicateNames = new Set(criteria.map((c) => c.name.toLowerCase())).size !== criteria.length;
    if (hasDuplicateNames) {
      toast.error('Criterion names must be unique');
      return;
    }
    if (criteria.some((c) => !c.name.trim())) {
      toast.error('All criteria must have a name');
      return;
    }

    const input = {
      criteria: criteria.map((c, index) => ({
        name: c.name,
        description: c.description,
        weight: c.weight,
        maxScore: c.maxScore,
        order: index,
      })),
    };

    await createOrUpdate.mutateAsync({ assignmentId, input });
    setIsEditing(false);
  };

  const handleLoadDefault = async () => {
    if (!defaultRubric) return;
    setCriteria(
      defaultRubric.criteria.map((c, index) => ({
        ...c,
        _id: `temp-${Date.now()}-${index}`,
        order: index,
        description: c.description ?? '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    );
    toast.success('Default rubric loaded');
  };

  const handleCopyFromAssignment = async () => {
    if (!sourceAssignmentId) {
      toast.error('Please select an assignment to copy from');
      return;
    }
    await copyRubric.mutateAsync({ assignmentId, sourceAssignmentId });
    await refetch();
    setShowCopyDialog(false);
    setSourceAssignmentId('');
  };

  const handleExport = () => {
    const data = { criteria: criteria.map((c) => ({
      name: c.name,
      description: c.description,
      weight: c.weight,
      maxScore: c.maxScore,
      order: c.order,
    })) };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rubric-${assignmentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.criteria && Array.isArray(parsed.criteria)) {
          setCriteria(
            parsed.criteria.map((c: { name: string; description?: string; weight: number; maxScore: number; order?: number }, index: number) => ({
              ...c,
              _id: `temp-${Date.now()}-${index}`,
              order: index,
              description: c.description ?? '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
          );
          toast.success('Rubric imported');
        } else {
          toast.error('Invalid JSON format');
        }
      } catch {
        toast.error('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Loading rubric...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Rubric Builder</h3>
        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="size-4 mr-1" />
              Export JSON
            </Button>
            <label className="button flex items-center gap-2" style={{ cursor: 'pointer' }}>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Upload className="size-4" />
              <span>Import JSON</span>
            </label>
            <Button variant="outline" size="sm" onClick={handleLoadDefault}>
              <RotateCcw className="size-4 mr-1" />
              Load Default
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCopyDialog(true)}>
              <Copy className="size-4 mr-1" />
              Copy from...
            </Button>
          </div>
        )}
      </div>

      {/* Weight Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Total Weight</span>
          <span className={cn('font-medium', isWeightValid ? 'text-success' : 'text-destructive')}>
            {totalWeight}% / 100%
          </span>
        </div>
        <Progress value={Math.min(totalWeight, 100)} className="h-3" />
        {!isWeightValid && totalWeight > 0 && (
          <p className="text-sm text-destructive">
            {totalWeight > 100 ? 'Weight exceeds 100%' : 'Weight must total 100%'}
          </p>
        )}
        {totalWeight === 0 && criteria.length > 0 && (
          <p className="text-sm text-muted-foreground">Add weights to criteria</p>
        )}
      </div>

      {/* Criteria List */}
      <div className="border rounded-lg p-4 bg-card">
        {criteria.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No criteria yet. Click "Add Criterion" to start building your rubric.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={criteria.map((c) => c._id)}
              strategy={verticalListSortingStrategy}
            >
              {criteria.map((criterion, index) => (
                <SortableCriterion
                  key={criterion._id}
                  criterion={criterion}
                  index={index}
                  onUpdate={handleUpdateCriterion}
                  onDelete={handleDeleteCriterion}
                  isEditing={isEditing}
                  onEdit={() => {}}
                  disabled={!isTeacherOrAdmin}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Preview Mode */}
      {criteria.length > 0 && (
        <div className="border rounded-lg p-4 bg-muted/50">
          <h4 className="font-medium mb-4">Preview: Score Calculation</h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2">Criterion</th>
                <th className="pb-2 text-center">Weight</th>
                <th className="pb-2 text-center">Max Score</th>
                <th className="pb-2 text-center">Weighted Max</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c) => (
                <tr key={c._id} className="border-b">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-center">{c.weight}%</td>
                  <td className="py-2 text-center">{c.maxScore}</td>
                  <td className="py-2 text-center font-medium">
                    {(c.weight * c.maxScore / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
              <tr className="font-bold">
                <td className="py-2">Total</td>
                <td className="py-2 text-center">{totalWeight}%</td>
                <td className="py-2 text-center">-</td>
                <td className="py-2 text-center">
                  {criteria.reduce((sum, c) => sum + c.weight * c.maxScore / 100, 0).toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Actions */}
      {isTeacherOrAdmin && (
        <div className="flex items-center justify-end gap-2">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={createOrUpdate.isPending}>
                Save Rubric
              </Button>
            </>
          ) : (
            <Button onClick={handleAddCriterion}>
              <Plus className="size-4 mr-1" />
              Add Criterion
            </Button>
          )}
        </div>
      )}

      {/* Copy Dialog */}
      <Dialog open={showCopyDialog} onOpenChange={setShowCopyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Rubric from Another Assignment</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="source-assignment">Source Assignment</Label>
              <Select value={sourceAssignmentId} onValueChange={setSourceAssignmentId}>
                <SelectTrigger id="source-assignment">
                  <SelectValue placeholder="Select an assignment" />
                </SelectTrigger>
                <SelectContent>
                  {assignments?.items
                    ?.filter((a) => a._id !== assignmentId)
                    .map((a) => (
                      <SelectItem key={a._id} value={a._id}>
                        {a.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCopyFromAssignment} disabled={copyRubric.isPending || !sourceAssignmentId}>
              Copy Rubric
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};