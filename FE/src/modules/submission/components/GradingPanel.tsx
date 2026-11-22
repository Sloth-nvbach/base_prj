import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ConfirmDialog } from '@/shared/components/confirm-dialog';
import { FormField } from '@/shared/components/form-field';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useAiReview, useFinalizeSubmission, useGradeSubmission } from '../hooks/use-submissions';
import { computeRubricScore, type AiReview, type SubmissionDetail } from '../types/submission.types';
import { AiReviewPanel } from './AiReviewPanel';

interface GradingPanelProps {
  detail: SubmissionDetail;
  /** Admins may change a finalized grade. */
  isAdmin: boolean;
}

const scoreField = (max: number) =>
  z.coerce.number({ message: 'Enter a number' }).min(0, 'Cannot be negative').max(max, `At most ${max}`);

/**
 * DSE-25/26: per-criterion scores with a live total, feedback, save draft and
 * finalize. The AI suggestion can pre-fill the form; the teacher decides.
 */
export const GradingPanel = ({ detail, isAdmin }: GradingPanelProps) => {
  const { submission, assignment, rubric } = detail;
  const criteria = useMemo(() => rubric?.criteria ?? [], [rubric]);
  const hasRubric = criteria.length > 0;
  const locked = submission.status === 'graded' && !isAdmin;

  const schema = useMemo(
    () =>
      z.object({
        scores: z.object(Object.fromEntries(criteria.map((c) => [c._id, scoreField(c.maxScore)]))),
        score: hasRubric ? z.any() : scoreField(assignment.maxScore),
        feedback: z.string().trim().max(5000),
      }),
    [criteria, hasRubric, assignment.maxScore],
  );
  type FormInput = z.input<typeof schema>;
  type FormOutput = z.output<typeof schema>;

  const saved = new Map((submission.criterionScores ?? []).map((c) => [c.criterionId, c.score]));
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      scores: Object.fromEntries(criteria.map((c) => [c._id, saved.get(c._id) ?? ''])),
      score: submission.score ?? '',
      feedback: submission.feedback ?? '',
    },
  });

  const grade = useGradeSubmission(submission._id);
  const finalize = useFinalizeSubmission(submission._id);
  const aiReview = useAiReview(submission._id);
  const [confirmFinalize, setConfirmFinalize] = useState(false);

  const watchedScores = useWatch({ control, name: 'scores' }) as Record<string, unknown> | undefined;
  const watchedScore = useWatch({ control, name: 'score' });
  const liveTotal = hasRubric
    ? computeRubricScore(
        criteria.map((c) => ({ score: Number(watchedScores?.[c._id]) || 0, maxScore: c.maxScore, weight: c.weight })),
        assignment.maxScore,
      )
    : Number(watchedScore) || 0;

  const applyAi = (review: AiReview) => {
    const suggested = new Map(review.criterionSuggestions.map((s) => [s.criterionId, s.score]));
    reset({
      scores: Object.fromEntries(criteria.map((c) => [c._id, suggested.get(c._id) ?? watchedScores?.[c._id] ?? ''])),
      score: review.suggestedScore ?? watchedScore,
      feedback: review.suggestedFeedback,
    });
  };

  const save = handleSubmit((values) =>
    grade.mutate(
      hasRubric
        ? { criterionScores: values.scores as Record<string, number>, feedback: values.feedback }
        : { score: values.score as number, feedback: values.feedback },
    ),
  );

  return (
    <div className="space-y-4">
      <AiReviewPanel
        review={submission.aiReview}
        pending={aiReview.isPending}
        onGenerate={() => aiReview.mutate()}
        onApply={applyAi}
        disabled={locked}
      />

      <form onSubmit={save} className="space-y-4 rounded-md border p-4" aria-label="Grading">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Grade</h2>
          <p className="text-sm" aria-live="polite">
            Total: <span className="text-lg font-semibold">{liveTotal}</span> / {assignment.maxScore}
          </p>
        </div>
        {submission.totalScore !== undefined && (
          <p className="text-xs text-muted-foreground">
            Auto test score: {submission.totalScore}/{submission.maxScore} points
          </p>
        )}

        {hasRubric ? (
          criteria.map((c) => {
            const scoreErrors = errors.scores as Record<string, { message?: string }> | undefined;
            return (
              <FormField
                key={c._id}
                id={`criterion-${c._id}`}
                label={`${c.name} (0–${c.maxScore}, weight ${c.weight}%)`}
                hint={c.description || undefined}
                error={scoreErrors?.[c._id]?.message}
              >
                <Input id={`criterion-${c._id}`} type="number" step="any" disabled={locked} {...register(`scores.${c._id}` as const)} />
              </FormField>
            );
          })
        ) : (
          <FormField id="grade-score" label={`Score (0–${assignment.maxScore})`} error={errors.score?.message as string | undefined}>
            <Input id="grade-score" type="number" step="any" disabled={locked} {...register('score')} />
          </FormField>
        )}

        <FormField id="grade-feedback" label="Feedback for the student" error={errors.feedback?.message}>
          <Textarea id="grade-feedback" rows={5} disabled={locked} {...register('feedback')} />
        </FormField>

        {locked ? (
          <p className="text-sm text-muted-foreground">This grade is finalized. Only an admin can change it.</p>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="submit" variant="outline" disabled={grade.isPending}>
              {grade.isPending ? 'Saving…' : 'Save draft'}
            </Button>
            {submission.status !== 'graded' && (
              <Button type="button" onClick={() => setConfirmFinalize(true)} disabled={submission.score === undefined || finalize.isPending}>
                Finalize grade
              </Button>
            )}
          </div>
        )}
        {submission.status !== 'graded' && submission.score === undefined && (
          <p className="text-xs text-muted-foreground">Save a draft before finalizing.</p>
        )}
      </form>

      <ConfirmDialog
        open={confirmFinalize}
        onOpenChange={setConfirmFinalize}
        title="Finalize this grade?"
        description={`The saved grade (${submission.score ?? '—'}/${assignment.maxScore}) becomes final and the student is notified.`}
        confirmLabel="Finalize"
        pending={finalize.isPending}
        onConfirm={() => finalize.mutate(undefined, { onSuccess: () => setConfirmFinalize(false) })}
      />
    </div>
  );
};
