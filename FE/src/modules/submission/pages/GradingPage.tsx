import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { ErrorState } from '@/shared/components/error-state';
import { LoadingState } from '@/shared/components/loading-state';
import { Button } from '@/shared/components/ui/button';
import { CodeViewer } from '../components/CodeViewer';
import { GradingPanel } from '../components/GradingPanel';
import { StatusBadge } from '../components/StatusBadge';
import { TestResultsTable } from '../components/TestResultsTable';
import { useSubmission } from '../hooks/use-submissions';
import { personName } from '../types/submission.types';

/**
 * DSE-35/36/37: split screen for grading. Left: problem and code. Right
 * (sticky on large screens): test results, AI review and the grade form.
 * Stacks vertically on small screens.
 */
export const GradingPage = () => {
  const { id = '' } = useParams();
  const detail = useSubmission(id);
  const { data: user } = useCurrentUser();

  if (detail.isPending) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { submission, assignment, student, testCases } = detail.data;
  const flaggedLines = (submission.aiReview?.issues ?? []).flatMap((issue) =>
    issue.lineStart ? Array.from({ length: (issue.lineEnd ?? issue.lineStart) - issue.lineStart + 1 }, (_, i) => issue.lineStart! + i) : [],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/submissions">
            <ArrowLeft className="mr-1 size-4" /> Back
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">
            {personName(student)} · submitted {new Date(submission.submittedAt).toLocaleString()} · {submission.language}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Problem and code" className="min-w-0 space-y-4">
          <div className="rounded-md border p-4">
            <h2 className="mb-2 font-semibold">Problem</h2>
            {assignment.description && <p className="mb-2 text-sm">{assignment.description}</p>}
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{assignment.instructions || 'No instructions.'}</p>
          </div>
          <CodeViewer code={submission.code} highlight={flaggedLines} />
        </section>

        <section aria-label="Results and grading" className="min-w-0 space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-auto">
          <div className="rounded-md border p-4">
            <h2 className="mb-2 font-semibold">Test results</h2>
            <TestResultsTable testCases={testCases} results={submission.testResults} runStatus={submission.runStatus} runMessage={submission.runMessage} />
          </div>
          <GradingPanel key={submission._id} detail={detail.data} isAdmin={user?.role === 'admin'} />
        </section>
      </div>
    </div>
  );
};
