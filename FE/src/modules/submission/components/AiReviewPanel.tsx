import { Sparkles } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import type { AiReview } from '../types/submission.types';

interface AiReviewPanelProps {
  review?: AiReview;
  pending: boolean;
  onGenerate: () => void;
  onApply?: (review: AiReview) => void;
  disabled?: boolean;
}

/** DSE-37: AI suggestion for the teacher. A suggestion, never the grade. */
export const AiReviewPanel = ({ review, pending, onGenerate, onApply, disabled }: AiReviewPanelProps) => (
  <section aria-labelledby="ai-review-title" className="space-y-3 rounded-md border p-4">
    <div className="flex items-center justify-between gap-2">
      <h2 id="ai-review-title" className="flex items-center gap-2 font-semibold">
        <Sparkles className="size-4" /> AI review
      </h2>
      <Button size="sm" variant="outline" onClick={onGenerate} disabled={pending || disabled}>
        {pending ? 'Analyzing…' : review ? 'Re-run AI review' : 'Run AI review'}
      </Button>
    </div>

    {!review ? (
      <p className="text-sm text-muted-foreground">
        Ask the AI to point out problems and suggest rubric scores. You decide the final grade.
      </p>
    ) : (
      <div className="space-y-3 text-sm">
        <p>{review.summary}</p>
        <p className="text-xs text-muted-foreground">
          Confidence: {review.confidence}
          {review.suggestedScore !== null && ` · Suggested score: ${review.suggestedScore}`}
          {' · '}
          {new Date(review.generatedAt).toLocaleString()}
        </p>

        {review.issues.length > 0 && (
          <ol className="space-y-2">
            {review.issues.map((issue, index) => (
              <li key={index} className="rounded border p-2">
                <p className="font-medium">
                  [{issue.severity}] {issue.title}
                  {issue.lineStart && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      line {issue.lineStart}
                      {issue.lineEnd && issue.lineEnd !== issue.lineStart ? `–${issue.lineEnd}` : ''}
                    </span>
                  )}
                </p>
                {issue.snippet && <pre className="mt-1 whitespace-pre-wrap rounded bg-muted/50 p-1 font-mono text-xs">{issue.snippet}</pre>}
                <p className="mt-1">{issue.cause}</p>
                {issue.fixSteps.length > 0 && (
                  <ul className="mt-1 list-disc pl-5">
                    {issue.fixSteps.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ul>
                )}
                {issue.concepts.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">Review: {issue.concepts.join(', ')}</p>
                )}
              </li>
            ))}
          </ol>
        )}

        {review.criterionSuggestions.length > 0 && (
          <ul className="space-y-1">
            {review.criterionSuggestions.map((s) => (
              <li key={s.criterionId}>
                <span className="font-medium">
                  {s.name}: {s.score}/{s.maxScore}
                </span>{' '}
                <span className="text-muted-foreground">— {s.reason}</span>
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
  </section>
);
