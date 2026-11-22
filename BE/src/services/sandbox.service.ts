/**
 * Sandbox service for DSE-22: integrates with Docker Sandbox Runner (DSE-58).
 * Calls external sandbox API to execute code against test cases.
 */
import { env } from '../config/env';
import { badRequest, notFound, serviceUnavailable, gatewayTimeout } from '../utils/app-error';

/** Sandbox API request payload. */
export interface SandboxRunRequest {
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'java' | 'cpp' | 'c';
  stdin?: string;
  testCases: { input: string; expectedOutput: string }[];
}

/** Individual test case result from sandbox. */
export interface SandboxTestResult {
  testCaseId: string;
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedMB: number;
}

/** Sandbox API response. */
export interface SandboxRunResponse {
  runId: string;
  status: 'completed' | 'timeout' | 'error' | 'memory_limit';
  results: SandboxTestResult[];
  summary: { total: number; passed: number; failed: number };
}

/** Error codes from sandbox that we map to user-friendly messages. */
export const SANDBOX_ERROR_CODES = {
  TIMEOUT: 'timeout',
  MEMORY_LIMIT: 'memory_limit',
  COMPILE_ERROR: 'compile_error',
  RUNTIME_ERROR: 'runtime_error',
  INTERNAL_ERROR: 'internal_error'
} as const;

export type SandboxErrorCode = (typeof SANDBOX_ERROR_CODES)[keyof typeof SANDBOX_ERROR_CODES];

/** Custom error for sandbox-specific failures. */
export class SandboxError extends Error {
  constructor(
    public readonly code: SandboxErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SandboxError';
  }
}

/**
 * Check if sandbox is configured. Throws 503 if not.
 */
export const assertSandboxConfigured = (): void => {
  if (!env.sandboxApiUrl) {
    throw serviceUnavailable('Sandbox runner not configured. Set SANDBOX_API_URL.');
  }
};

/**
 * Call the sandbox API to run code against test cases.
 * DSE-58 endpoint: POST /api/sandbox/run
 */
export const runCodeInSandbox = async (request: SandboxRunRequest): Promise<SandboxRunResponse> => {
  assertSandboxConfigured();

  const controller = new AbortController();
  const timeoutMs = 30000; // 30s total timeout for sandbox call (sandbox has 10s internal timeout)
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (env.sandboxApiKey) {
      headers['Authorization'] = `Bearer ${env.sandboxApiKey}`;
    }

    const response = await fetch(`${env.sandboxApiUrl}/api/sandbox/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const errorMessage = errorBody.message || `Sandbox API error: ${response.status}`;
      throw new SandboxError(SANDBOX_ERROR_CODES.INTERNAL_ERROR, errorMessage, { status: response.status });
    }

    const data = (await response.json()) as SandboxRunResponse;

    // Validate response shape
    if (!data.runId || !data.status || !Array.isArray(data.results)) {
      throw new SandboxError(SANDBOX_ERROR_CODES.INTERNAL_ERROR, 'Invalid sandbox response format');
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof SandboxError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new SandboxError(SANDBOX_ERROR_CODES.TIMEOUT, 'Sandbox request timed out');
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new SandboxError(SANDBOX_ERROR_CODES.INTERNAL_ERROR, 'Cannot connect to sandbox runner');
    }

    throw new SandboxError(SANDBOX_ERROR_CODES.INTERNAL_ERROR, `Sandbox request failed: ${(error as Error).message}`);
  }
};

/**
 * Map sandbox status to submission status and user-friendly message.
 */
export const mapSandboxStatus = (sandboxStatus: SandboxRunResponse['status']): {
  submissionStatus: 'graded' | 'failed';
  message: string;
} => {
  switch (sandboxStatus) {
    case 'completed':
      return { submissionStatus: 'graded', message: 'Code ran to the end; see each test case for the result' };
    case 'timeout':
      return { submissionStatus: 'failed', message: 'Execution timed out (10s limit)' };
    case 'memory_limit':
      return { submissionStatus: 'failed', message: 'Memory limit exceeded (256MB)' };
    case 'error':
    default:
      return { submissionStatus: 'failed', message: 'Execution failed (compile or runtime error)' };
  }
};

/**
 * Convert sandbox test results to submission test results format.
 * Adds testCaseId from the original test case mapping.
 */
export const convertSandboxResults = (
  sandboxResults: SandboxTestResult[],
  testCaseIds: string[]
): {
  testResults: Array<{
    testCaseId: string;
    passed: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    executionTimeMs: number;
    memoryUsedMB: number;
    points: number;
  }>;
  totalScore: number;
  maxScore: number;
} => {
  // Map results by index (sandbox returns results in same order as testCases sent)
  const testResults = sandboxResults.map((result, index) => ({
    testCaseId: testCaseIds[index] ?? result.testCaseId,
    passed: result.passed,
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    executionTimeMs: result.executionTimeMs,
    memoryUsedMB: result.memoryUsedMB,
    points: result.passed ? 1 : 0 // Points will be calculated properly in grading service
  }));

  const totalScore = testResults.filter((r) => r.passed).length;
  const maxScore = testResults.length;

  return { testResults, totalScore, maxScore };
};