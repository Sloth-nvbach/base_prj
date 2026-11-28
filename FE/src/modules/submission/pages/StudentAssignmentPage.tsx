import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { assignmentApi } from '@/modules/assignment/api/assignment.api';
import { useAssignment } from '@/modules/assignment/hooks/use-assignments';
import { DataTable, type DataTableColumn } from '@/shared/components/data-table';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { FormField } from '@/shared/components/form-field';
import { LoadingState } from '@/shared/components/loading-state';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { submissionApi } from '../api/submission.api';
import { StatusBadge } from '../components/StatusBadge';
import { useCreateSubmission, useMySubmissions } from '../hooks/use-submissions';
import { SUBMISSION_LANGUAGES, type Submission } from '../types/submission.types';

/** Languages the sandbox runs today (DSE-58); others can be submitted but not auto-tested. */
const RUNNABLE = new Set(['javascript', 'typescript', 'python']);

const schema = z.object({
  language: z.enum(SUBMISSION_LANGUAGES),
  code: z.string().max(100000, 'Code is too long').refine((value) => value.trim().length > 0, 'Code cannot be empty'),
});

const historyColumns: DataTableColumn<Submission>[] = [
  { id: 'submittedAt', header: 'Submitted', cell: (s) => new Date(s.submittedAt).toLocaleString() },
  { id: 'language', header: 'Language', cell: (s) => s.language },
  { id: 'tests', header: 'Tests', cell: (s) => (s.runStatus ? `${s.testResults.filter((r) => r.passed).length}/${s.testResults.length}` : 'Not run') },
  { id: 'status', header: 'Status', cell: (s) => <StatusBadge status={s.status} /> },
  { id: 'score', header: 'Score', cell: (s) => s.score ?? '—' },
  {
    id: 'open',
    header: <span className="sr-only">Open</span>,
    className: 'text-right',
    cell: (s) => (
      <Button asChild size="sm" variant="outline">
        <Link to={`/my-submissions/${s._id}`}>Details</Link>
      </Button>
    ),
  },
];

/** DSE-54/55: read the problem, submit code (then tests run automatically) and see the history. */
export const StudentAssignmentPage = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const assignment = useAssignment(id);
  const access = useQuery({ queryKey: ['assignments', 'access', id], queryFn: () => assignmentApi.getSubmissionAccess(id), enabled: !!id });
  const history = useMySubmissions({ assignment: id, limit: 50, sort: '-createdAt' });
  const create = useCreateSubmission();
  const run = useMutation({ mutationFn: submissionApi.run });

  const { register, handleSubmit, formState: { errors } } = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { language: 'python', code: '' },
  });

  const submit = handleSubmit(async (values) => {
    // Errors are already shown as toasts by the mutation defaults.
    const submission = await create.mutateAsync({ assignment: id, ...values }).catch(() => null);
    if (!submission) return;
    if (!RUNNABLE.has(values.language)) return navigate(`/my-submissions/${submission._id}`);
    // A failed run start (e.g. sandbox offline) is shown as a toast; the submission is saved anyway.
    const started = await run.mutateAsync(submission._id).catch(() => null);
    navigate(`/my-submissions/${submission._id}${started ? `?job=${started.jobId}` : ''}`);
  });

  if (assignment.isPending) return <LoadingState />;
  if (assignment.isError) return <ErrorState error={assignment.error} onRetry={() => void assignment.refetch()} />;
  const a = assignment.data;
  const pending = create.isPending || run.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title={a.title}
        description={`Max score ${a.maxScore}${a.dueDate ? `, due ${new Date(a.dueDate).toLocaleString()}` : ''}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/my-assignments">
              <ArrowLeft className="mr-1 size-4" /> My assignments
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Problem" className="space-y-2 rounded-lg border bg-card p-4 sm:p-5">
          <h2 className="text-base font-semibold">Problem</h2>
          {a.description && <p className="text-sm">{a.description}</p>}
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.instructions || 'No instructions.'}</p>
        </section>

        <section aria-label="Your solution" className="rounded-lg border bg-card p-4 sm:p-5">
          {access.data && !access.data.canSubmit ? (
            <p className="text-sm text-muted-foreground">Submissions are closed: {access.data.reason}</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <FormField id="submission-language" label="Language" error={errors.language?.message}>
                <select id="submission-language" className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm transition-colors hover:border-muted-foreground" {...register('language')}>
                  {SUBMISSION_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                      {RUNNABLE.has(lang) ? '' : ' (no auto-test yet)'}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="submission-code" label="Code" error={errors.code?.message}>
                <Textarea id="submission-code" rows={14} spellCheck={false} className="font-mono text-sm" {...register('code')} />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" disabled={pending}>
                  {pending ? 'Submitting…' : 'Submit and run tests'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>

      <section aria-label="My submissions" className="space-y-2">
        <h2 className="text-base font-semibold">My submissions</h2>
        {history.isError ? (
          <ErrorState error={history.error} onRetry={() => void history.refetch()} />
        ) : (
          <DataTable
            label="My submissions"
            columns={historyColumns}
            rows={history.data?.items ?? []}
            getRowId={(s) => s._id}
            isLoading={history.isPending}
            emptyState={<EmptyState title="No submissions yet" description="Your attempts show up here." />}
          />
        )}
      </section>
    </div>
  );
};
