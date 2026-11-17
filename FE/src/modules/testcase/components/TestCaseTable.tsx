import { useState } from 'react';
import { Plus, Trash2, GripVertical, Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Label } from '@/shared/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/shared/components/ui/dialog';
import { DataTable } from '@/shared/components/data-table/data-table';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { useTestCases, useCreateTestCase, useUpdateTestCase, useDeleteTestCase, useCreateTestCasesBulk } from '../hooks/use-testcases';
import type { TestCase, CreateTestCaseInput, UpdateTestCaseInput } from '../types/testcase.types';

interface TestCaseTableProps {
  assignmentId: string;
  isTeacherOrAdmin: boolean;
}

const PAGE_SIZE = 10;

export const TestCaseTable = ({ assignmentId, isTeacherOrAdmin }: TestCaseTableProps) => {
  const listParams = { assignmentId, sort: 'order', limit: PAGE_SIZE };
  const testCases = useTestCases(listParams);
  const createTestCase = useCreateTestCase();
  const updateTestCase = useUpdateTestCase();
  const deleteTestCase = useDeleteTestCase();
  const createBulk = useCreateTestCasesBulk();

  const [editing, setEditing] = useState<TestCase | null>(null);
  const [editInput, setEditInput] = useState<UpdateTestCaseInput>({});
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');

  const columns = [
    {
      id: 'order',
      header: '#',
      cell: (tc: TestCase) => tc.order + 1,
      className: 'w-12 text-center',
    },
    {
      id: 'input',
      header: 'Input',
      cell: (tc: TestCase) => (
        <code className="text-sm bg-muted p-1.5 rounded max-w-[300px] truncate block">{tc.input}</code>
      ),
    },
    {
      id: 'expectedOutput',
      header: 'Expected Output',
      cell: (tc: TestCase) => (
        <code className="text-sm bg-muted p-1.5 rounded max-w-[300px] truncate block">{tc.expectedOutput}</code>
      ),
    },
    {
      id: 'isHidden',
      header: 'Hidden',
      cell: (tc: TestCase) => (
        <Checkbox checked={tc.isHidden} disabled={!isTeacherOrAdmin} className="mx-auto" />
      ),
      className: 'w-16 text-center',
    },
    {
      id: 'points',
      header: 'Points',
      cell: (tc: TestCase) => tc.points,
      className: 'w-16 text-center',
    },
    {
      id: 'actions',
      header: '',
      cell: (tc: TestCase) => (
        <div className="flex items-center gap-1 justify-end">
          {isTeacherOrAdmin && (
            <>
              <Button variant="ghost" size="sm" onClick={() => setEditing(tc)} title="Edit">
                <GripVertical className="size-4" />
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setPendingDelete([tc._id])} title="Delete">
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      ),
      className: 'w-24',
    },
  ];

  const handleCreate = async (input: CreateTestCaseInput) => {
    await createTestCase.mutateAsync({ assignmentId, input });
  };

  const handleUpdate = async (id: string, input: UpdateTestCaseInput) => {
    await updateTestCase.mutateAsync({ id, input });
  };

  const handleDelete = async (ids: string[]) => {
    for (const id of ids) {
      await deleteTestCase.mutateAsync({ id, assignmentId });
    }
  };

  const handleImport = async () => {
    try {
      const parsed = JSON.parse(importJson);
      if (!Array.isArray(parsed)) {
        toast.error('Invalid JSON: expected an array of test cases');
        return;
      }
      const testCases: CreateTestCaseInput[] = parsed.map((tc, index) => ({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden ?? false,
        order: tc.order ?? index,
        points: tc.points ?? 10,
      }));
      await createBulk.mutateAsync({ assignmentId, input: { testCases } });
      setShowImportDialog(false);
      setImportJson('');
    } catch {
      toast.error('Invalid JSON format');
    }
  };

  const exportJson = () => {
    const data = testCases.data?.items ?? [];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-cases-${assignmentId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (testCases.isError) {
    return <div className="text-destructive">Error loading test cases: {testCases.error?.message}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Test Cases</h3>
        {isTeacherOrAdmin && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportJson}>
              <Download className="size-4 mr-1" />
              Export JSON
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
              <Upload className="size-4 mr-1" />
              Import JSON
            </Button>
            <Button size="sm" onClick={() => setEditing({ _id: '', assignmentId, input: '', expectedOutput: '', isHidden: false, order: 0, points: 10, createdAt: '', updatedAt: '' })}>
              <Plus className="size-4 mr-1" />
              Add Test Case
            </Button>
          </div>
        )}
      </div>

      <DataTable
        label="Test Cases"
        columns={columns}
        rows={testCases.data?.items ?? []}
        getRowId={(tc) => tc._id}
        isLoading={testCases.isPending}
        sort={listParams.sort}
        onSortChange={() => {}}
        selectedIds={[]}
        onSelectedIdsChange={() => {}}
        emptyState={
          <div className="py-8 text-center text-muted-foreground">
            No test cases yet. {isTeacherOrAdmin && 'Click "Add Test Case" to create one.'}
          </div>
        }
      />

      {testCases.data && (
        <p className="text-sm text-muted-foreground">{testCases.data.total} test cases</p>
      )}

      {/* Edit Dialog */}
      {editing && (
        <Dialog open={true} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing._id ? 'Edit Test Case' : 'Add Test Case'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="tc-input">Input</Label>
                <Textarea
                  id="tc-input"
                  value={editInput.input ?? editing.input}
                  onChange={(e) => setEditInput({ ...editInput, input: e.target.value })}
                  placeholder="Enter input for test case"
                  rows={3}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="tc-output">Expected Output</Label>
                <Textarea
                  id="tc-output"
                  value={editInput.expectedOutput ?? editing.expectedOutput}
                  onChange={(e) => setEditInput({ ...editInput, expectedOutput: e.target.value })}
                  placeholder="Enter expected output"
                  rows={3}
                  required
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="tc-hidden"
                    checked={editInput.isHidden ?? editing.isHidden}
                    onChange={(checked: unknown) => setEditInput({ ...editInput, isHidden: checked as boolean })}
                  />
                  <Label htmlFor="tc-hidden">Hidden (anti-cheat)</Label>
                </div>
                <div className="grid gap-2 w-40">
                  <Label htmlFor="tc-points">Points</Label>
                  <Input
                    id="tc-points"
                    type="number"
                    min="1"
                    max="100"
                    value={editInput.points ?? editing.points}
                    onChange={(e) => setEditInput({ ...editInput, points: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (editing._id) {
                    await handleUpdate(editing._id, editInput);
                  } else {
                    await handleCreate(editInput as CreateTestCaseInput);
                  }
                  setEditing(null);
                  setEditInput({});
                }}
                disabled={createTestCase.isPending || updateTestCase.isPending}
              >
                {editing._id ? 'Save' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm Delete */}
      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(open) => !open && setPendingDelete([])}
        title={pendingDelete.length === 1 ? 'Delete this test case?' : `Delete ${pendingDelete.length} test cases?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={deleteTestCase.isPending}
        onConfirm={() => handleDelete(pendingDelete)}
      />

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Test Cases from JSON</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="import-json">JSON Array</Label>
              <Textarea
                id="import-json"
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"input": "1\n2\n", "expectedOutput": "3\n", "isHidden": false, "order": 0, "points": 10}]'
                rows={10}
                className="font-mono text-sm"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Expected format: array of objects with input, expectedOutput, isHidden (optional), order (optional), points (optional)
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={createBulk.isPending}>
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};