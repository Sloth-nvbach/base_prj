import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { testcaseApi } from '../api/testcase.api';
import type {
  CreateTestCaseInput,
  UpdateTestCaseInput,
  TestCaseListParams,
  TestResultListParams,
  ReorderTestCasesInput,
  BulkCreateTestCasesInput,
} from '../types/testcase.types';

export const testcaseKeys = {
  all: ['testcases'] as const,
  list: (params: TestCaseListParams) => [...testcaseKeys.all, 'list', params] as const,
  detail: (id: string) => [...testcaseKeys.all, 'detail', id] as const,
  results: (params: TestResultListParams) => [...testcaseKeys.all, 'results', params] as const,
  resultDetail: (id: string) => [...testcaseKeys.all, 'result', id] as const,
};

export const useTestCases = (params: TestCaseListParams) =>
  useQuery({
    queryKey: testcaseKeys.list(params),
    queryFn: () => testcaseApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useTestCase = (id: string) =>
  useQuery({
    queryKey: testcaseKeys.detail(id),
    queryFn: () => testcaseApi.get(id),
    enabled: !!id,
  });

export const useCreateTestCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: CreateTestCaseInput }) =>
      testcaseApi.create(assignmentId, input),
    onSuccess: (_, { assignmentId }) => {
      toast.success('Test case created.');
      queryClient.invalidateQueries({ queryKey: testcaseKeys.list({ assignmentId }) });
    },
  });
};

export const useCreateTestCasesBulk = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: BulkCreateTestCasesInput }) =>
      testcaseApi.createBulk(assignmentId, input),
    onSuccess: (_, { assignmentId }) => {
      toast.success('Test cases imported.');
      queryClient.invalidateQueries({ queryKey: testcaseKeys.list({ assignmentId }) });
    },
  });
};

export const useUpdateTestCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTestCaseInput }) => testcaseApi.update(id, input),
    onSuccess: (data) => {
      toast.success('Test case updated.');
      queryClient.invalidateQueries({ queryKey: testcaseKeys.list({ assignmentId: data.assignmentId }) });
    },
  });
};

export const useDeleteTestCase = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assignmentId }: { id: string; assignmentId: string }) =>
      testcaseApi.remove(id).then(() => assignmentId),
    onSuccess: (assignmentId) => {
      toast.success('Test case deleted.');
      queryClient.invalidateQueries({ queryKey: testcaseKeys.list({ assignmentId }) });
    },
  });
};

export const useReorderTestCases = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, input }: { assignmentId: string; input: ReorderTestCasesInput }) =>
      testcaseApi.reorder(assignmentId, input),
    onSuccess: (_, { assignmentId }) => {
      toast.success('Test cases reordered.');
      queryClient.invalidateQueries({ queryKey: testcaseKeys.list({ assignmentId }) });
    },
  });
};

// Test Results
export const useTestResults = (params: TestResultListParams) =>
  useQuery({
    queryKey: testcaseKeys.results(params),
    queryFn: () => testcaseApi.listResults(params),
    placeholderData: keepPreviousData,
  });

export const useTestResult = (id: string) =>
  useQuery({
    queryKey: testcaseKeys.resultDetail(id),
    queryFn: () => testcaseApi.getResult(id),
    enabled: !!id,
  });