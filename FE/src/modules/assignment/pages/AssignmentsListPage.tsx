import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/ui/button';
import { DataTable, FilterSelect, SearchInput, TableToolbar } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { LoadingState } from '@/shared/components/loading-state';
import { PageHeader } from '@/shared/components/page-header';
import { Pagination } from '@/shared/components/pagination';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useAssignments, useCreateAssignment, useDeleteAssignment } from '../hooks/use-assignments';
import type { Assignment, AssignmentListParams } from '../types/assignment.types';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { FormField } from '@/shared/components/form-field';
import { Input } from '@/shared/components/ui/input';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { AssignmentStatusBadge } from '../components/AssignmentStatusBadge';

const PAGE_SIZE = 10;
const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

export const AssignmentsListPage = () => {
  const list = useListParams({ sort: '-createdAt' });
  const status = list.get('status') as AssignmentListParams['status'];
  const q = list.get('q');

  const assignments = useAssignments({ page: list.page, limit: PAGE_SIZE, q, status, sort: list.sort });
  const createAssignment = useCreateAssignment();
  const deleteAssignment = useDeleteAssignment();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<string[]>([]);

  const changeList = (key: string, value: string) => {
    setSelectedIds([]);
    list.set(key, value);
  };

  const columns = [
    {
      id: 'title',
      header: 'Title',
      cell: (a: Assignment) => (
        <div>
          <Link to={`/assignments/${a._id}`} className="font-medium hover:text-primary hover:underline">{a.title}</Link>
          <p className="text-sm text-muted-foreground truncate max-w-xs">{a.description}</p>
        </div>
      ),
      className: 'min-w-48',
    },
    {
      id: 'status',
      header: 'Status',
      cell: (a: Assignment) => (
        <AssignmentStatusBadge status={a.status} />
      ),
      className: 'w-32',
    },
    {
      id: 'maxScore',
      header: 'Max Score',
      cell: (a: Assignment) => <span className="font-mono tabular-nums">{a.maxScore}</span>,
      className: 'w-24 text-center',
    },
    {
      id: 'dueDate',
      header: 'Due Date',
      cell: (a: Assignment) => a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—',
      className: 'w-36 text-center',
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: (a: Assignment) => new Date(a.createdAt).toLocaleDateString(),
      className: 'w-36 text-center',
    },
  ];

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createAssignment.mutateAsync({ title: newTitle.trim() });
      setShowCreateDialog(false);
      setNewTitle('');
    } finally {
      setCreating(false);
    }
  };

  const confirmDelete = () =>
    deleteAssignment.mutate(pendingDelete, {
      onSuccess: () => {
        setSelectedIds((ids) => ids.filter((id) => !pendingDelete.includes(id)));
        setPendingDelete([]);
      },
    });

  const isFiltered = Boolean(q || status);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assignments"
        description="Manage programming assignments"
        actions={
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4" />
            Create Assignment
          </Button>
        }
      />

      <TableToolbar
        actions={
          selectedIds.length > 0 && (
            <Button variant="destructive" onClick={() => setPendingDelete(selectedIds)}>
              <Trash2 className="size-4" />
              {selectedIds.length === 1 ? 'Delete' : `Delete (${selectedIds.length})`}
            </Button>
          )
        }
      >
        <SearchInput
          label="Search assignments"
          placeholder="Search title or description…"
          defaultValue={q}
          onSearch={(value) => changeList('q', value)}
        />
        <FilterSelect
          label="Status"
          value={status ?? ''}
          options={STATUS_OPTIONS}
          onChange={(value) => changeList('status', value)}
        />
      </TableToolbar>

      {assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />
      ) : assignments.isPending ? (
        <LoadingState />
      ) : (
        <>
          <DataTable
            label="Assignments"
            columns={columns}
            rows={assignments.data?.items ?? []}
            getRowId={(a) => a._id}
            isLoading={assignments.isPending}
            sort={list.sort}
            onSortChange={(sort) => changeList('sort', sort)}
            selectedIds={selectedIds}
            onSelectedIdsChange={setSelectedIds}
            emptyState={
              <EmptyState
                title={isFiltered ? 'No matching assignments' : 'No assignments yet'}
                description={isFiltered ? 'Try another search or filter.' : 'Create your first assignment to get started.'}
                action={
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="size-4" />
                    Create Assignment
                  </Button>
                }
              />
            }
          />
          {assignments.data && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">{assignments.data.total} assignments</p>
              <Pagination
                page={assignments.data.page}
                totalPages={assignments.data.totalPages}
                onPageChange={(page) => {
                  setSelectedIds([]);
                  list.setPage(page);
                }}
              />
            </div>
          )}
        </>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Create assignment</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate();
            }}
          >
            <FormField id="new-assignment-title" label="Title">
              <Input
                id="new-assignment-title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Recursion: Fibonacci"
                autoFocus
              />
            </FormField>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !newTitle.trim()}>
                {creating ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={pendingDelete.length > 0}
        onOpenChange={(open) => !open && setPendingDelete([])}
        title={pendingDelete.length === 1 ? 'Delete this assignment?' : `Delete ${pendingDelete.length} assignments?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        pending={deleteAssignment.isPending}
        onConfirm={confirmDelete}
      />
    </div>
  );
};