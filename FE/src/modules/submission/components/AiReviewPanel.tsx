import { Sparkles } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import type { AiReview } from '../types/submission.types';

interface AiReviewPanelProps {
  review?: AiReview;
  pending: boolean;
  onGenerate: () => void;
  onApply?: (review: AiReview) => void;
  disabled?: boolean;
}

const SEVERITY_VARIANT = { high: 'destructive', medium: 'warning', low: 'secondary' } as const;

/** DSE-37: AI suggestion for the teacher. A suggestion, never the grade. */
export const AiReviewPanel = ({ review, pending, onGenerate, onApply, disabled }: AiReviewPanelProps) => (
  <section aria-labelledby="ai-review-title" className="rounded-lg border bg-card">
    <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
      <h2 id="ai-review-title" className="flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="size-4 text-primary" aria-hidden="true" /> AI review
      </h2>
      <Button size="sm" variant="outline" onClick={onGenerate} disabled={pending || disabled}>
        {pending ? 'Analyzing…' : review ? 'Re-run AI review' : 'Run AI review'}
      </Button>
    </div>

    <div className="p-4">
      {!review ? (
        <p className="text-sm text-muted-foreground">
          Ask the AI to point out problems and suggest rubric scores. You decide the final grade.
        </p>
      ) : (
        <div className="space-y-4 text-sm">
          <p className="leading-relaxed">{review.summary}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Confidence: {review.confidence}</span>
            {review.suggestedScore !== null && <span>Suggested score: {review.suggestedScore}</span>}
            <time dateTime={review.generatedAt}>{new Date(review.generatedAt).toLocaleString()}</time>
          </p>

          {review.issues.length > 0 && (
            <ol className="space-y-2">
              {review.issues.map((issue, index) => (
                <li key={index} className="rounded-md border border-l-2 border-l-primary/60 bg-background/60 p-3">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <Badge variant={SEVERITY_VARIANT[issue.severity] ?? 'secondary'}>{issue.severity}</Badge>
                    {issue.title}
                    {issue.lineStart && (
                      <span className="font-mono text-xs text-muted-foreground">
                        line {issue.lineStart}
                        {issue.lineEnd && issue.lineEnd !== issue.lineStart ? `–${issue.lineEnd}` : ''}
                      </span>
                    )}
                  </p>
                  {issue.snippet && (
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-md border bg-background p-2 font-mono text-xs">{issue.snippet}</pre>
                  )}
                  <p className="mt-2 leading-relaxed">{issue.cause}</p>
                  {issue.fixSteps.length > 0 && (
                    <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
                      {issue.fixSteps.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  )}
                  {issue.concepts.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">Review: {issue.concepts.join(', ')}</p>
                  )}
                </li>
              ))}
            </ol>
          )}

          {review.criterionSuggestions.length > 0 && (
            <ul className="divide-y rounded-md border">
              {review.criterionSuggestions.map((s) => (
                <li key={s.criterionId} className="flex flex-col gap-0.5 px-3 py-2 sm:flex-row sm:gap-3">
                  <span className="shrink-0 font-medium">
                    {s.name}: <span className="font-mono tabular-nums">{s.score}/{s.maxScore}</span>
                  </span>
                  <span className="text-muted-foreground">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}

          {review.limitations && <p className="text-xs text-muted-foreground">Limitations: {review.limitations}</p>}

          {onApply && (
            <Button size="sm" onClick={() => onApply(review)} disabled={disabled}>
              Use AI suggestion as draft
            </Button>
          )}
        </div>
      )}
    </div>
  </section>
);
