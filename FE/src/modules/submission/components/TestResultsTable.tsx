import type { TestCase } from '@/modules/testcase/types/testcase.types';
import { cn } from '@/shared/lib/utils';
import type { RunStatus, SubmissionTestResult } from '../types/submission.types';

interface TestResultsTableProps {
  testCases: TestCase[];
  results: SubmissionTestResult[];
  runStatus?: RunStatus;
  runMessage?: string;
}

const outcome = (result: SubmissionTestResult | undefined) => {
  if (!result) return { icon: '·', label: 'Not run', tone: 'text-muted-foreground' };
  if (result.passed) return { icon: '✓', label: 'Passed', tone: 'text-success' };
  if (/Time limit exceeded/.test(result.stderr)) return { icon: '⏱', label: 'Timeout', tone: 'text-warning' };
  if (/Memory limit exceeded/.test(result.stderr)) return { icon: '!', label: 'Out of memory', tone: 'text-warning' };
  if (result.exitCode !== 0) return { icon: '!', label: 'Error', tone: 'text-destructive' };
  return { icon: '✗', label: 'Failed', tone: 'text-destructive' };
};

const Pre = ({ children }: { children: string }) => (
  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-background p-2 font-mono text-xs leading-relaxed">{children || '(empty)'}</pre>
);

/**
 * DSE-23: one row per test case with input, expected and actual output.
 * Hidden cases (student view) show only pass/fail. Rows expand for stdout/stderr.
 */
export const TestResultsTable = ({ testCases, results, runStatus, runMessage }: TestResultsTableProps) => {
  const byId = new Map(results.map((r) => [r.testCaseId, r]));
  const visibleIds = new Set(testCases.map((t) => t._id));
  // Results of cases the viewer may not see (hidden for students) still count in the summary.
  const hiddenResults = results.filter((r) => !visibleIds.has(r.testCaseId));
  const passed = results.filter((r) => r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.executionTimeMs, 0);

  if (testCases.length === 0 && results.length === 0) {
    return <p className="text-sm text-muted-foreground">No test cases for this assignment.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-md border bg-muted/40 px-3 py-2 font-mono text-[0.8125rem]" role="status">
        {results.length > 0 && (
          <span aria-hidden="true" className="flex gap-0.5">
            {results.map((r) => (
              <span key={r.testCaseId} className={cn('size-2.5 rounded-[2px]', r.passed ? 'bg-success' : 'bg-destructive')} />
            ))}
          </span>
        )}
        <span className="font-medium">{results.length ? `${passed}/${results.length} passed` : 'Not run yet'}</span>
        {results.length > 0 && <span className="text-muted-foreground">Total time {totalTime} ms</span>}
        {runStatus && <span className="text-muted-foreground">Run: {runStatus}</span>}
        {runMessage && <span className="text-muted-foreground">{runMessage}</span>}
      </div>

      <ul className="space-y-2">
        {testCases.map((testCase, index) => {
          const result = byId.get(testCase._id);
          const o = outcome(result);
          return (
            <li key={testCase._id} className="rounded-md border bg-card">
              <details>
                <summary className="flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/50">
                  <span className="w-8 font-mono text-muted-foreground">#{index + 1}</span>
                  <span className={cn('font-mono font-medium', o.tone)}>
                    <span aria-hidden="true">{o.icon}</span> {o.label}
                  </span>
                  {testCase.isHidden && <span className="text-xs text-muted-foreground">(hidden)</span>}
                  {result && <span className="ml-auto font-mono text-xs text-muted-foreground tabular-nums">{result.executionTimeMs} ms</span>}
                </summary>
                <div className="grid gap-3 border-t p-3 md:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Input</p>
                    <Pre>{testCase.input}</Pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Expected</p>
                    <Pre>{testCase.expectedOutput}</Pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">Actual</p>
                    <Pre>{result?.stdout ?? ''}</Pre>
                  </div>
                  {result?.stderr && (
                    <div className="md:col-span-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">stderr</p>
                      <Pre>{result.stderr}</Pre>
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
        {hiddenResults.map((result, index) => {
          const o = outcome(result);
          return (
            <li key={result.testCaseId} className="flex items-center gap-3 rounded-md border bg-card px-3 py-2 text-sm">
              <span className="w-8 font-mono text-muted-foreground">H{index + 1}</span>
              <span className={cn('font-mono font-medium', o.tone)}>
                <span aria-hidden="true">{o.icon}</span> {o.label}
              </span>
              <span className="text-xs text-muted-foreground">(hidden test case)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
