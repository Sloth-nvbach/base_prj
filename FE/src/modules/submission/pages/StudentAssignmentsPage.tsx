import { Link } from 'react-router-dom';
import { useAssignments } from '@/modules/assignment/hooks/use-assignments';
import type { Assignment } from '@/modules/assignment/types/assignment.types';
import { DataTable, type DataTableColumn } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { Pagination } from '@/shared/components/pagination';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { useListParams } from '@/shared/hooks/use-list-params';
import { useMySubmissions } from '../hooks/use-submissions';
import { progressByAssignment, type Progress } from '../types/submission.types';

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<Progress['status'], string> = { not_started: 'Not started', submitted: 'Submitted', graded: 'Graded' };

/** Due-date urgency: red under 24h, orange under 72h (DSE-53/54). */
const dueTone = (dueDate?: string) => {
  if (!dueDate) return '';
  const hours = (new Date(dueDate).getTime() - Date.now()) / 36e5;
  if (hours < 0) return 'text-muted-foreground line-through';
  if (hours < 24) return 'text-destructive font-medium';
  if (hours < 72) return 'text-orange-600 dark:text-orange-400 font-medium';
  return '';
};

/** DSE-54: the student's exercises with their status, attempts and score. */
export const StudentAssignmentsPage = () => {
  const list = useListParams({ sort: 'dueDate' });
  const assignments = useAssignments({ page: list.page, limit: PAGE_SIZE, sort: list.sort });
  // shortcut: progress uses the latest 100 submissions; paginate per assignment if students submit more.
  const mine = useMySubmissions({ limit: 100, sort: '-createdAt' });
  const progress = progressByAssignment(mine.data?.items ?? []);
  const progressOf = (a: Assignment) => progress.get(a._id) ?? { attempts: 0, status: 'not_started' as const };

  const columns: DataTableColumn<Assignment>[] = [
    {
      id: 'title',
      header: 'Exercise',
      sortKey: 'title',
      cell: (a) => (
        <Link to={`/my-assignments/${a._id}`} className="font-medium hover:underline">
          {a.title}
        </Link>
      ),
    },
    {
      id: 'dueDate',
      header: 'Due',
      sortKey: 'dueDate',
      cell: (a) => <span className={dueTone(a.dueDate)}>{a.dueDate ? new Date(a.dueDate).toLocaleString() : '—'}</span>,
    },
    { id: 'maxScore', header: 'Max score', cell: (a) => a.maxScore },
    { id: 'status', header: 'My status', cell: (a) => <Badge variant={progressOf(a).status === 'graded' ? 'default' : 'outline'}>{STATUS_LABEL[progressOf(a).status]}</Badge> },
    { id: 'attempts', header: 'Attempts', cell: (a) => progressOf(a).attempts },
    { id: 'score', header: 'My score', cell: (a) => progressOf(a).bestScore ?? '—' },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      className: 'text-right',
      cell: (a) => (
        <Button asChild size="sm" variant={a.status === 'closed' ? 'outline' : 'default'}>
          <Link to={`/my-assignments/${a._id}`}>{a.status === 'closed' ? 'View' : 'Open'}</Link>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="My assignments" description="Programming exercises, deadlines and your progress" />
      {assignments.isError ? (
        <ErrorState error={assignments.error} onRetry={() => void assignments.refetch()} />
      ) : (
        <>
          <DataTable
            label="My assignments"
            columns={columns}
            rows={assignments.data?.items ?? []}
            getRowId={(a) => a._id}
            isLoading={assignments.isPending}
            sort={list.sort}
            onSortChange={(sort) => list.set('sort', sort)}
            emptyState={<EmptyState title="No assignments yet" description="Published exercises from your teachers show up here." />}
          />
          {assignments.data && (
            <Pagination page={assignments.data.page} totalPages={assignments.data.totalPages} onPageChange={list.setPage} />
          )}
        </>
      )}
    </div>
  );
};
