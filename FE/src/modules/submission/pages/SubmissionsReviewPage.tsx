import { Link } from 'react-router-dom';
import { useAssignments } from '@/modules/assignment/hooks/use-assignments';
import { DataTable, FilterSelect, TableToolbar, type DataTableColumn } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { PageHeader } from '@/shared/components/page-header';
import { Pagination } from '@/shared/components/pagination';
import { Button } from '@/shared/components/ui/button';
import { useListParams } from '@/shared/hooks/use-list-params';
import { StatusBadge } from '../components/StatusBadge';
import { useReviewSubmissions } from '../hooks/use-submissions';
import { personName, type ReviewListParams, type Submission } from '../types/submission.types';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Waiting for grade' },
  { value: 'graded', label: 'Graded' },
];

const assignmentTitle = (s: Submission) => (s.assignment && typeof s.assignment === 'object' ? s.assignment.title : '—');

const columns: DataTableColumn<Submission>[] = [
  { id: 'student', header: 'Student', cell: (s) => personName(s.student) },
  { id: 'assignment', header: 'Assignment', cell: assignmentTitle },
  { id: 'submittedAt', header: 'Submitted', sortKey: 'submittedAt', cell: (s) => new Date(s.submittedAt).toLocaleString() },
  { id: 'run', header: 'Tests', cell: (s) => (s.runStatus ? `${s.testResults.filter((r) => r.passed).length}/${s.testResults.length}` : 'Not run') },
  { id: 'totalScore', header: 'Auto-score', sortKey: 'totalScore', cell: (s) => (s.totalScore !== undefined ? `${s.totalScore}/${s.maxScore}` : '—') },
  { id: 'score', header: 'Grade', sortKey: 'score', cell: (s) => s.score ?? '—' },
  { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
  {
    id: 'actions',
    header: <span className="sr-only">Actions</span>,
    className: 'text-right',
    cell: (s) => (
      <Button asChild size="sm" variant={s.status === 'graded' ? 'ghost' : 'outline'}>
        <Link to={`/submissions/${s._id}/grade`}>{s.status === 'graded' ? 'View' : 'Grade'}</Link>
      </Button>
    ),
  },
];

/** DSE-38: submissions waiting for the teacher, filterable by assignment and status. */
export const SubmissionsReviewPage = () => {
  const list = useListParams({ sort: '-submittedAt' });
  const assignment = list.get('assignment');
  const status = list.get('status') as ReviewListParams['status'];
  const submissions = useReviewSubmissions({ page: list.page, limit: PAGE_SIZE, sort: list.sort, assignment, status });
  const assignments = useAssignments({ limit: 100, sort: '-createdAt' });

  const assignmentOptions = [
    { value: '', label: 'All assignments' },
    ...(assignments.data?.items ?? []).map((a) => ({ value: a._id, label: a.title })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Grading" description="Student submissions of your assignments" />
      <TableToolbar>
        <FilterSelect label="Assignment" value={assignment} options={assignmentOptions} onChange={(v) => list.set('assignment', v)} />
        <FilterSelect label="Status" value={status ?? ''} options={STATUS_OPTIONS} onChange={(v) => list.set('status', v)} />
      </TableToolbar>

      {submissions.isError ? (
        <ErrorState error={submissions.error} onRetry={() => void submissions.refetch()} />
      ) : (
        <>
          <DataTable
            label="Submissions"
            columns={columns}
            rows={submissions.data?.items ?? []}
            getRowId={(s) => s._id}
            isLoading={submissions.isPending}
            sort={list.sort}
            onSortChange={(sort) => list.set('sort', sort)}
            emptyState={<EmptyState title="No submissions" description="Submissions of your assignments show up here." />}
          />
          {submissions.data && (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <p className="text-sm text-muted-foreground">{submissions.data.total} submissions</p>
              <Pagination page={submissions.data.page} totalPages={submissions.data.totalPages} onPageChange={list.setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
};
