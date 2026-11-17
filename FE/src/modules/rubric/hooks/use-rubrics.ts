import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { rubricApi } from '../api/rubric.api';
import type { CreateRubricInput, UpdateRubricInput, RubricListParams } from '../types/rubric.types';

export const rubricKeys = {
  all: ['rubrics'] as const,
  list: (params: RubricListParams) => [...rubricKeys.all, 'list', params] as const,
  byAssignment: (assignmentId: string) => [...rubricKeys.all, 'assignment', assignmentId] as const,
  detail: (id: string) => [...rubricKeys.all, 'detail', id] as const,
  default: () => [...rubricKeys.all, 'default'] as const,
};

export const useRubrics = (params: RubricListParams) =>
  useQuery({
    queryKey: rubricKeys.list(params),
    queryFn: () => rubricApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useRubricByAssignment = (assignmentId: string) =>
  useQuery({
    queryKey: rubricKeys.byAssignment(assignmentId),
    queryFn: () => rubricApi.getByAssignment(assignmentId),
    enabled: !!assignmentId,
  });

export const useRubric = (id: string) =>
  useQuery({
    queryKey: rubricKeys.detail(id),
    queryFn: () => rubricApi.getById(id),
    enabled: !!id,
  });

export const useDefaultRubric = () =>
  useQuery({
    queryKey: rubricKeys.default(),
    queryFn: rubricApi.getDefault,
  });

export const useCreateOrUpdateRubric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: CreateRubricInput | UpdateRubricInput }) =>
      rubricApi.createOrUpdate(assignmentId, input),
    onSuccess: (data) => {
      toast.success('Rubric saved.');
      queryClient.invalidateQueries({ queryKey: rubricKeys.byAssignment(data.assignmentId) });
      queryClient.invalidateQueries({ queryKey: rubricKeys.all });
    },
  });
};

export const useUpdateRubric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRubricInput }) => rubricApi.update(id, input),
    onSuccess: (data) => {
      toast.success('Rubric updated.');
      queryClient.invalidateQueries({ queryKey: rubricKeys.byAssignment(data.assignmentId) });
      queryClient.invalidateQueries({ queryKey: rubricKeys.all });
    },
  });
};

export const useDeleteRubric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignmentId }: { id: string; assignmentId: string }) =>
      rubricApi.remove(id).then(() => assignmentId),
    onSuccess: (assignmentId) => {
      toast.success('Rubric deleted.');
      queryClient.invalidateQueries({ queryKey: rubricKeys.byAssignment(assignmentId) });
      queryClient.invalidateQueries({ queryKey: rubricKeys.all });
    },
  });
};

export const useCopyRubric = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, sourceAssignmentId }: { assignmentId: string; sourceAssignmentId: string }) =>
      rubricApi.copyFromAssignment(assignmentId, sourceAssignmentId),
    onSuccess: (data) => {
      toast.success('Rubric copied.');
      queryClient.invalidateQueries({ queryKey: rubricKeys.byAssignment(data.assignmentId) });
      queryClient.invalidateQueries({ queryKey: rubricKeys.all });
    },
  });
};