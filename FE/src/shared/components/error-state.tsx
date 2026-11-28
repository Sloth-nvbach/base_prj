import { AlertTriangle } from 'lucide-react';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { Button } from '@/shared/components/ui/button';

interface ErrorStateProps {
  /** The thrown value; its backend message is shown when there is one. */
  error?: unknown;
  title?: string;
  onRetry?: () => void;
}

/** Shown when loading data failed. Pair with `query.error` and `query.refetch`. */
export const ErrorState = ({ error, title = 'Something went wrong', onRetry }: ErrorStateProps) => (
  <div role="alert" className="flex flex-col items-start gap-3 rounded-lg border border-destructive/50 border-l-4 border-l-destructive bg-destructive/5 p-5 sm:flex-row sm:items-center">
    <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
    <div className="flex-1">
      <p className="font-mono font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{getApiErrorMessage(error, 'Please try again.')}</p>
    </div>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);
