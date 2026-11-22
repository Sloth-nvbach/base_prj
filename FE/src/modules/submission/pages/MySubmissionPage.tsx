import { ArrowLeft, Download } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ErrorState } from '@/shared/components/error-state';
import { LoadingState } from '@/shared/components/loading-state';
import { PageHeader } from '@/shared/components/page-header';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { CodeViewer } from '../components/CodeViewer';
import { StatusBadge } from '../components/StatusBadge';
import { TestResultsTable } from '../components/TestResultsTable';
import { useRunResult, useSubmission } from '../hooks/use-submissions';

const EXTENSIONS: Record<string, string> = { javascript: 'js', typescript: 'ts', python: 'py', java: 'java', cpp: 'cpp', c: 'c' };

const downloadCode = (code: string, language: string) => {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `submission.${EXTENSIONS[language] ?? 'txt'}`;
  link.click();
  URL.revokeObjectURL(url);
};

/** DSE-55: one of the student's submissions — code, test results, rubric scores, feedback. */
export const MySubmissionPage = () => {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const detail = useSubmission(id);
  const run = useRunResult(id, params.get('job'));
  const running = run.data ? !['completed', 'failed'].includes(run.data.status) : run.isPending && !!params.get('job');

  if (detail.isPending) return <LoadingState />;
  if (detail.isError) return <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />;

  const { submission, assignment, testCases } = detail.data;
  const graded = submission.status === 'graded';

  return (
    <div className="space-y-6">
      <PageHeader
        title={assignment.title}
        description={`Submitted ${new Date(submission.submittedAt).toLocaleString()} · ${submission.language}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={submission.status} />
            <Button asChild variant="outline">
              <Link to={`/my-assignments/${assignment._id}`}>
                <ArrowLeft className="mr-1 size-4" /> Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="rounded-md border p-4" role="status">
        {graded ? (
          <p className="text-lg">
            Final score: <span className="font-semibold">{submission.score}</span> / {assignment.maxScore}
          </p>
        ) : running ? (
          <p>Running your code against the test cases…</p>
        ) : (
          <p className="text-muted-foreground">Waiting for your teacher to grade this submission.</p>
        )}
      </div>

      <Tabs defaultValue="results">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="code">Code</TabsTrigger>
          <TabsTrigger value="results">Test results</TabsTrigger>
          <TabsTrigger value="rubric">Rubric</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="space-y-2 pt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => downloadCode(submission.code, submission.language)}>
              <Download className="mr-1 size-4" /> Download code
            </Button>
          </div>
          <CodeViewer code={submission.code} />
        </TabsContent>

        <TabsContent value="results" className="pt-4">
          <TestResultsTable testCases={testCases} results={submission.testResults} runStatus={submission.runStatus} runMessage={submission.runMessage} />
        </TabsContent>

        <TabsContent value="rubric" className="pt-4">
          {graded && submission.criterionScores?.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2">Criterion</th>
                  <th>My score</th>
                  <th>Max</th>
                  <th>Weight</th>
                </tr>
              </thead>
              <tbody>
                {submission.criterionScores.map((c) => (
                  <tr key={c.criterionId} className="border-b">
                    <td className="py-2">{c.name}</td>
                    <td>{c.score}</td>
                    <td>{c.maxScore}</td>
                    <td>{c.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">{graded ? 'Graded without a rubric.' : 'Rubric scores appear after grading.'}</p>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="pt-4">
          {graded && submission.feedback ? (
            <p className="whitespace-pre-wrap rounded-md border p-4 text-sm">{submission.feedback}</p>
          ) : (
            <p className="text-sm text-muted-foreground">{graded ? 'No feedback.' : 'Feedback appears after grading.'}</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
