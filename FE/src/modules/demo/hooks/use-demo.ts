import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { demoApi } from '../api/demo.api';
import type { DemoResult } from '../types/demo.types';

/** Cache keys of the two lists shown on the demo page. */
export const demoKeys = {
  all: ['demo'] as const,
  assignments: ['demo', 'assignments'] as const,
  submissions: ['demo', 'submissions'] as const
};

export const useDemoAssignments = () =>
  useQuery({ queryKey: demoKeys.assignments, queryFn: demoApi.listAssignments });

export const useDemoSubmissions = () =>
  useQuery({ queryKey: demoKeys.submissions, queryFn: demoApi.listSubmissions });

/** The axios error of a refused request, as a demo result (status 0 = never reached the server). */
const errorToResult = (label: string, error: unknown): DemoResult => {
  const refused = error as { response?: { status?: number; data?: unknown } };
  return { label, status: refused?.response?.status ?? 0, data: refused?.response?.data ?? null };
};

/**
 * One demo action = one button on the page. It reports the raw HTTP answer
 * (status + body, refused requests included) to `onResult`, toasts, and
 * refreshes the given list keys. Because `onError` is set, the shared query
 * client skips its own toast — so it is shown here.
 */
const useDemoAction = <TVariables>(
  label: string,
  action: (variables: TVariables) => Promise<Omit<DemoResult, 'label'>>,
  onResult: (result: DemoResult) => void,
  { successMessage, invalidate }: { successMessage?: string; invalidate?: readonly (readonly unknown[])[] } = {}
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (result) => {
      if (successMessage) toast.success(successMessage);
      onResult({ label, ...result });
      return Promise.all(
        (invalidate ?? []).map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Request failed'));
      onResult(errorToResult(label, error));
    }
  });
};

// DSE-14/16: assignment management.
export const useDemoGetAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/assignments/:id', demoApi.getAssignment, onResult);

export const useDemoCreateAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/assignments', demoApi.createAssignment, onResult, {
    successMessage: 'Assignment created.',
    invalidate: [demoKeys.assignments]
  });

export const useDemoUpdateAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'PATCH /api/assignments/:id',
    ({ id, input }: { id: string; input: Record<string, unknown> }) => demoApi.updateAssignment(id, input),
    onResult,
    { successMessage: 'Assignment updated.', invalidate: [demoKeys.assignments] }
  );

export const useDemoDeleteAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('DELETE /api/assignments/:id', demoApi.deleteAssignment, onResult, {
    successMessage: 'Assignment deleted.',
    invalidate: [demoKeys.assignments]
  });

// DSE-19: can the current account submit right now?
export const useDemoCheckAccess = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/assignments/:id/submission-access', demoApi.checkSubmissionAccess, onResult);

// DSE-17: submit code; DSE-18: the history list.
export const useDemoSubmit = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/submissions', demoApi.createSubmission, onResult, {
    successMessage: 'Code submitted.',
    invalidate: [demoKeys.submissions]
  });
