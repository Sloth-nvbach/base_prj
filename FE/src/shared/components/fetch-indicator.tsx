import { useIsFetching, useIsMutating } from '@tanstack/react-query';

/**
 * Thin amber line under the top bar while any request is in flight, so long
 * runs and saves show progress without a spinner on every widget.
 * Reduced motion: a still line instead of the sweep.
 */
export const FetchIndicator = () => {
  const busy = useIsFetching() + useIsMutating() > 0;
  if (!busy) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
      <div className="h-full w-2/5 animate-scan bg-primary motion-reduce:w-full motion-reduce:animate-none motion-reduce:opacity-60" />
    </div>
  );
};
