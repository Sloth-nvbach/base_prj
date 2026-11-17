export interface TestCase {
  _id: string;
  assignmentId: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  order: number;
  points: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestCaseInput {
  input: string;
  expectedOutput: string;
  isHidden?: boolean;
  order?: number;
  points?: number;
}

export interface UpdateTestCaseInput {
  input?: string;
  expectedOutput?: string;
  isHidden?: boolean;
  order?: number;
  points?: number;
}

export interface TestCaseListParams {
  page?: number;
  limit?: number;
  sort?: string;
  assignmentId?: string;
  isHidden?: 'true' | 'false' | '';
}

export interface TestResult {
  _id: string;
  submissionId: string;
  testCaseId: string;
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedMB: number;
  createdAt: string;
  updatedAt: string;
}

export interface TestResultListParams {
  page?: number;
  limit?: number;
  sort?: string;
  submissionId?: string;
  testCaseId?: string;
  passed?: 'true' | 'false' | '';
}

export interface ReorderTestCasesInput {
  testCaseIds: string[];
}

export interface BulkCreateTestCasesInput {
  testCases: CreateTestCaseInput[];
}