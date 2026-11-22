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
  if (!result) return { icon: '•', label: 'Not run', tone: 'text-muted-foreground' };
  if (result.passed) return { icon: '✅', label: 'Passed', tone: 'text-primary' };
  if (/Time limit exceeded/.test(result.stderr)) return { icon: '⏱', label: 'Timeout', tone: 'text-destructive' };
  if (/Memory limit exceeded/.test(result.stderr)) return { icon: '💾', label: 'Out of memory', tone: 'text-destructive' };
  if (result.exitCode !== 0) return { icon: '⚠️', label: 'Error', tone: 'text-destructive' };
  return { icon: '❌', label: 'Failed', tone: 'text-destructive' };
};

const Pre = ({ children }: { children: string }) => (
  <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted/50 p-2 font-mono text-xs">{children || '(empty)'}</pre>
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border px-3 py-2 text-sm" role="status">
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
            <li key={testCase._id} className="rounded-md border">
              <details>
                <summary className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                  <span className="w-8 text-muted-foreground">#{index + 1}</span>
                  <span className={cn('font-medium', o.tone)}>
                    {o.icon} {o.label}
                  </span>
                  {testCase.isHidden && <span className="text-xs text-muted-foreground">(hidden)</span>}
                  {result && <span className="ml-auto text-xs text-muted-foreground">{result.executionTimeMs} ms</span>}
                </summary>
                <div className="grid gap-3 border-t p-3 md:grid-cols-3">
                  <div>
                    <p className="mb-1 text-xs font-medium">Input</p>
                    <Pre>{testCase.input}</Pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium">Expected</p>
                    <Pre>{testCase.expectedOutput}</Pre>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium">Actual</p>
                    <Pre>{result?.stdout ?? ''}</Pre>
                  </div>
                  {result?.stderr && (
                    <div className="md:col-span-3">
                      <p className="mb-1 text-xs font-medium">stderr</p>
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
            <li key={result.testCaseId} className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <span className="w-8 text-muted-foreground">H{index + 1}</span>
              <span className={cn('font-medium', o.tone)}>
                {o.icon} {o.label}
              </span>
              <span className="text-xs text-muted-foreground">(hidden test case)</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
