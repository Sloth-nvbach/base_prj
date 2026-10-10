import { describe, expect, it, vi } from 'vitest';
import { createQueryClient } from './query-client';

const toastError = vi.fn();
vi.mock('sonner', () => ({ toast: { error: (msg: string) => toastError(msg) } }));

const httpError = (status: number, message?: string) => ({ response: { status, data: { message } } });

describe('createQueryClient', () => {
  it('does not retry client errors and retries other failures once', () => {
    const retry = createQueryClient().getDefaultOptions().queries?.retry as (n: number, e: unknown) => boolean;

    expect(retry(0, httpError(404))).toBe(false);
    expect(retry(0, httpError(500))).toBe(true);
    expect(retry(1, httpError(500))).toBe(false);
    expect(retry(0, new Error('Network Error'))).toBe(true);
  });

  it('toasts the backend message for mutations without their own onError', async () => {
    const client = createQueryClient();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(httpError(409, 'Title already exists')),
    });

    await mutation.execute(undefined).catch(() => undefined);

    expect(toastError).toHaveBeenCalledWith('Title already exists');
  });

  it('stays quiet when the mutation handles its own error', async () => {
    toastError.mockReset();
    const client = createQueryClient();
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => Promise.reject(httpError(400, 'Bad')),
      onError: () => undefined,
    });

    await mutation.execute(undefined).catch(() => undefined);

    expect(toastError).not.toHaveBeenCalled();
  });
});
