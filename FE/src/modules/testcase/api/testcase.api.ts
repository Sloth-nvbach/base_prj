import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type {
  TestCase,
  CreateTestCaseInput,
  UpdateTestCaseInput,
  TestCaseListParams,
  TestResult,
  TestResultListParams,
  ReorderTestCasesInput,
  BulkCreateTestCasesInput,
} from '../types/testcase.types';

const cleanParams = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const testcaseApi = {
  list: (params: TestCaseListParams = {}) =>
    http.get<Paginated<TestCase>>('/test-cases', { params: cleanParams(params) }).then((r) => r.data),

  get: (id: string) =>
    http.get<TestCase>(`/test-cases/${id}`).then((r) => r.data),

  create: (assignmentId: string, input: CreateTestCaseInput) =>
    http.post<TestCase>(`/test-cases/assignment/${assignmentId}`, input).then((r) => r.data),

  createBulk: (assignmentId: string, input: BulkCreateTestCasesInput) =>
    http.post<TestCase[]>(`/test-cases/assignment/${assignmentId}/bulk`, input).then((r) => r.data),

  update: (id: string, input: UpdateTestCaseInput) =>
    http.patch<TestCase>(`/test-cases/${id}`, input).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/test-cases/${id}`).then(() => undefined),

  reorder: (assignmentId: string, input: ReorderTestCasesInput) =>
    http.post<TestCase[]>(`/test-cases/assignment/${assignmentId}/reorder`, input).then((r) => r.data),

  // Test Results (read-only)
  listResults: (params: TestResultListParams = {}) =>
    http.get<Paginated<TestResult>>('/test-cases/results', { params: cleanParams(params) }).then((r) => r.data),

  getResult: (id: string) =>
    http.get<TestResult>(`/test-cases/results/${id}`).then((r) => r.data),

  // Export/Import
  export: (assignmentId: string) =>
    http.get<TestCase[]>(`/test-cases/assignment/${assignmentId}/export`).then((r) => r.data),

  import: (assignmentId: string, testCases: CreateTestCaseInput[]) =>
    http.post<TestCase[]>(`/test-cases/assignment/${assignmentId}/import`, { testCases }).then((r) => r.data),
};