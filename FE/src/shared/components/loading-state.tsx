import { Skeleton } from '@/shared/components/ui/skeleton';

interface LoadingStateProps {
  /** Number of placeholder rows. */
  rows?: number;
}

/** Skeleton rows shown while data loads. */
export const LoadingState = ({ rows = 3 }: LoadingStateProps) => (
  <div className="space-y-3" aria-busy="true" aria-label="Loading">
    {Array.from({ length: rows }, (_, index) => (
      <Skeleton key={index} className="h-16 w-full" />
    ))}
  </div>
);
