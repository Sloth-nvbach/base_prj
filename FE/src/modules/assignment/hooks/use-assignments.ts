import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { assignmentApi } from '../api/assignment.api';
import type { UpdateAssignmentInput, AssignmentListParams } from '../types/assignment.types';

export const assignmentKeys = {
  all: ['assignments'] as const,
  list: (params: AssignmentListParams) => [...assignmentKeys.all, 'list', params] as const,
  detail: (id: string) => [...assignmentKeys.all, 'detail', id] as const,
};

export const useAssignments = (params: AssignmentListParams) =>
  useQuery({
    queryKey: assignmentKeys.list(params),
    queryFn: () => assignmentApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useAssignment = (id: string) =>
  useQuery({
    queryKey: assignmentKeys.detail(id),
    queryFn: () => assignmentApi.get(id),
    enabled: !!id,
  });

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignmentApi.create,
    onSuccess: () => {
      toast.success('Assignment created.');
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
};

export const useUpdateAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateAssignmentInput }) => assignmentApi.update(id, input),
    onSuccess: () => {
      toast.success('Assignment updated.');
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string | string[]) => {
      const idArray = Array.isArray(ids) ? ids : [ids];
      for (const id of idArray) {
        await assignmentApi.remove(id);
      }
      return { deleted: idArray.length };
    },
    onSuccess: ({ deleted }) => {
      toast.success(deleted === 1 ? 'Assignment deleted.' : `${deleted} assignments deleted.`);
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
    },
  });
};