import { MutationCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from './api-error';

const statusOf = (error: unknown) =>
  (error as { response?: { status?: number } } | null)?.response?.status;

/**
 * Shared TanStack Query client.
 * - Client errors (4xx) are never retried; other failures are retried once.
 * - A mutation without its own `onError` shows the backend message as a toast.
 */
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          const status = statusOf(error);
          if (status && status >= 400 && status < 500) return false;
          return failureCount < 1;
        },
      },
    },
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        if (mutation.options.onError) return;
        toast.error(getApiErrorMessage(error, 'Something went wrong'));
      },
    }),
  });

export const queryClient = createQueryClient();
