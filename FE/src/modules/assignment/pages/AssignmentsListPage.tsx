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
import { cn } from '@/shared/lib/utils';

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
          <Link to={`/assignments/${a._id}`} className="font-medium hover:underline">{a.title}</Link>
          <p className="text-sm text-muted-foreground truncate max-w-xs">{a.description}</p>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (a: Assignment) => (
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
            a.status === 'draft' && 'bg-muted text-muted-foreground',
            a.status === 'published' && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
            a.status === 'closed' && 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          )}
        >
          {a.status}
        </span>
      ),
      className: 'w-32',
    },
    {
      id: 'maxScore',
      header: 'Max Score',
      cell: (a: Assignment) => a.maxScore,
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
            <Plus className="size-4 mr-1" />
            Create Assignment
          </Button>
        }
      />

      <TableToolbar
        actions={
          selectedIds.length > 0 && (
            <Button variant="destructive" onClick={() => setPendingDelete(selectedIds)}>
              <Trash2 className="size-4 mr-1" />
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
                    <Plus className="size-4 mr-1" />
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

      {/* Create Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create Assignment</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Enter assignment title"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
                  {creating ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {pendingDelete.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="bg-card rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">
              {pendingDelete.length === 1 ? 'Delete this assignment?' : `Delete ${pendingDelete.length} assignments?`}
            </h3>
            <p className="text-muted-foreground mb-4">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPendingDelete([])}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleteAssignment.isPending}>
                {deleteAssignment.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};