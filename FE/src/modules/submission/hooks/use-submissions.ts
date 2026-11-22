import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { submissionApi } from '../api/submission.api';
import type { GradeInput, MySubmissionsParams, ReviewListParams } from '../types/submission.types';

export const submissionKeys = {
  all: ['submissions'] as const,
  mine: (params: MySubmissionsParams) => [...submissionKeys.all, 'mine', params] as const,
  review: (params: ReviewListParams) => [...submissionKeys.all, 'review', params] as const,
  detail: (id: string) => [...submissionKeys.all, 'detail', id] as const,
};

export const useMySubmissions = (params: MySubmissionsParams, enabled = true) =>
  useQuery({ queryKey: submissionKeys.mine(params), queryFn: () => submissionApi.listMine(params), placeholderData: keepPreviousData, enabled });

export const useReviewSubmissions = (params: ReviewListParams, enabled = true) =>
  useQuery({ queryKey: submissionKeys.review(params), queryFn: () => submissionApi.listForReview(params), placeholderData: keepPreviousData, enabled });

export const useSubmission = (id: string) =>
  useQuery({ queryKey: submissionKeys.detail(id), queryFn: () => submissionApi.get(id), enabled: !!id });

const useInvalidateSubmissions = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: submissionKeys.all });
};

export const useCreateSubmission = () => {
  const invalidate = useInvalidateSubmissions();
  return useMutation({ mutationFn: submissionApi.create, onSuccess: () => { toast.success('Submitted.'); void invalidate(); } });
};

export const useGradeSubmission = (id: string) => {
  const invalidate = useInvalidateSubmissions();
  return useMutation({
    mutationFn: (input: GradeInput) => submissionApi.grade(id, input),
    onSuccess: () => { toast.success('Draft grade saved.'); void invalidate(); },
  });
};

export const useFinalizeSubmission = (id: string) => {
  const invalidate = useInvalidateSubmissions();
  return useMutation({
    mutationFn: () => submissionApi.finalize(id),
    onSuccess: () => { toast.success('Grade finalized. The student was notified.'); void invalidate(); },
  });
};

export const useAiReview = (id: string) => {
  const invalidate = useInvalidateSubmissions();
  return useMutation({
    mutationFn: () => submissionApi.aiReview(id),
    onSuccess: () => { toast.success('AI review ready.'); void invalidate(); },
  });
};

/** Polls a sandbox run until it finishes, then refreshes submission data. */
export const useRunResult = (id: string, jobId: string | null) => {
  const invalidate = useInvalidateSubmissions();
  return useQuery({
    // Outside submissionKeys.all, so the refresh below does not cancel this poll.
    queryKey: ['submission-run', id, jobId],
    queryFn: async () => {
      const result = await submissionApi.runResult(id, jobId!);
      if (result.status === 'completed' || result.status === 'failed') void invalidate();
      return result;
    },
    enabled: !!jobId,
    refetchInterval: (query) => (['completed', 'failed'].includes(query.state.data?.status ?? '') ? false : 1000),
  });
};
