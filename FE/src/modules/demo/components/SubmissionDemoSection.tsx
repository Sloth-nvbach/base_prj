import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { EmptyState } from '@/shared/components/empty-state';
import { ErrorState } from '@/shared/components/error-state';
import { FormField } from '@/shared/components/form-field';
import { LoadingState } from '@/shared/components/loading-state';
import { Textarea } from '@/shared/components/ui/textarea';
import { useDemoAssignments, useDemoSubmit, useDemoSubmissions } from '../hooks/use-demo';
import { DEMO_LANGUAGES, type DemoResult } from '../types/demo.types';

const selectClass =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50';

const submitSchema = z.object({
  assignment: z.string().min(1, 'Pick an assignment'),
  // Deliberately mirrors the backend only lightly: whitespace-only code passes
  // here and gets rejected by the API with a 400 — that is worth demoing.
  code: z.string().min(1, 'Code is required').max(100000),
  language: z.enum(DEMO_LANGUAGES)
});

type SubmitValues = z.infer<typeof submitSchema>;

interface SubmissionDemoSectionProps {
  onResult: (result: DemoResult) => void;
}

/** DSE-17/18/19: submit code and see the caller's own submission history. */
export const SubmissionDemoSection = ({ onResult }: SubmissionDemoSectionProps) => {
  const assignments = useDemoAssignments();
  const history = useDemoSubmissions();
  const submit = useDemoSubmit(onResult);

  const { register, handleSubmit, formState: { errors } } = useForm<SubmitValues>({
    resolver: zodResolver(submitSchema),
    defaultValues: { assignment: '', code: '', language: 'javascript' }
  });

  const onSubmit = handleSubmit((values) => submit.mutate(values));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Submissions — DSE-17/18/19</CardTitle>
        <CardDescription>
          Only students (role <code>student</code>) may submit; drafts, closed and past-deadline assignments are
          rejected by the backend. The history lists the caller's own submissions only, each naming its assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="space-y-3 rounded-lg border border-dashed p-3" onSubmit={onSubmit}>
          <p className="text-sm font-medium">Submit code (student)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField id="demo-assignment" label="Assignment" error={errors.assignment?.message}>
              <select id="demo-assignment" className={selectClass} {...register('assignment')}>
                <option value="">— pick one —</option>
                {(assignments.data?.items ?? []).map((assignment) => (
                  <option key={assignment._id} value={assignment._id}>
                    {assignment.title}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="demo-language" label="Language" error={errors.language?.message}>
              <select id="demo-language" className={selectClass} {...register('language')}>
                {DEMO_LANGUAGES.map((language) => (
                  <option key={language} value={language}>
                    {language}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField id="demo-code" label="Code" error={errors.code?.message} hint="try whitespace-only to see the 400">
            <Textarea id="demo-code" rows={5} className="font-mono" {...register('code')} />
          </FormField>
          <Button type="submit" disabled={submit.isPending}>
            Submit code
          </Button>
        </form>

        <div className="space-y-2">
          <p className="text-sm font-medium">My submission history (DSE-18)</p>
          {history.isPending && <LoadingState rows={2} />}
          {history.isError && <ErrorState error={history.error} onRetry={() => history.refetch()} />}
          {history.isSuccess && history.data.items.length === 0 && (
            <EmptyState title="Nothing submitted yet" description="Submit code above — every attempt is kept." />
          )}
          {history.isSuccess &&
            history.data.items.map((submission) => (
              <div key={submission._id} className="space-y-1 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{submission.assignment?.title ?? 'Deleted assignment'}</p>
                  <div className="flex gap-1.5">
                    <Badge variant="outline">{submission.language}</Badge>
                    <Badge variant={submission.status === 'graded' ? 'default' : 'secondary'}>{submission.status}</Badge>
                    {submission.score !== undefined && <Badge variant="default">{submission.score}</Badge>}
                  </div>
                </div>
                <pre className="max-h-24 overflow-auto rounded-md bg-muted p-2 text-xs">{submission.code}</pre>
                <p className="text-xs text-muted-foreground">
                  Submitted {new Date(submission.submittedAt).toLocaleString()}
                  {submission.assignment ? ` · assignment is ${submission.assignment.status}` : ' · assignment was deleted'}
                </p>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
};
