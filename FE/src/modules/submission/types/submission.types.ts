import type { Assignment } from '@/modules/assignment/types/assignment.types';
import type { Rubric } from '@/modules/rubric/types/rubric.types';
import type { TestCase } from '@/modules/testcase/types/testcase.types';

export const SUBMISSION_LANGUAGES = ['javascript', 'python', 'typescript', 'java', 'cpp', 'c'] as const;
export type SubmissionLanguage = (typeof SUBMISSION_LANGUAGES)[number];
export type SubmissionStatus = 'submitted' | 'graded';
export type RunStatus = 'completed' | 'timeout' | 'error' | 'memory_limit';

export interface SubmissionTestResult {
  testCaseId: string;
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedMB: number;
  points: number;
  /** Set on student views: output of hidden cases is not shown. */
  hidden?: boolean;
}

export interface CriterionScore {
  criterionId: string;
  name: string;
  score: number;
  maxScore: number;
  weight: number;
}

export interface AiIssue {
  title: string;
  severity: 'high' | 'medium' | 'low';
  lineStart?: number;
  lineEnd?: number;
  snippet?: string;
  cause: string;
  fixSteps: string[];
  concepts: string[];
}

export interface AiReview {
  summary: string;
  issues: AiIssue[];
  criterionSuggestions: (CriterionScore & { reason: string })[];
  suggestedScore: number | null;
  suggestedFeedback: string;
  confidence: 'high' | 'medium' | 'low';
  limitations: string;
  generatedAt: string;
}

export interface PersonRef {
  _id: string;
  email: string;
  displayName?: string;
}

export interface Submission {
  _id: string;
  assignment: string | Pick<Assignment, '_id' | 'title' | 'maxScore' | 'dueDate' | 'status'> | null;
  student: string | PersonRef;
  code: string;
  language: SubmissionLanguage;
  submittedAt: string;
  status: SubmissionStatus;
  score?: number;
  feedback: string;
  testResults: SubmissionTestResult[];
  totalScore?: number;
  maxScore?: number;
  runStatus?: RunStatus;
  runMessage?: string;
  lastRunAt?: string;
  criterionScores?: CriterionScore[];
  aiReview?: AiReview;
  gradedAt?: string;
  createdAt: string;
}

export interface SubmissionDetail {
  submission: Submission;
  assignment: Assignment;
  student: PersonRef | null;
  testCases: TestCase[];
  rubric: Rubric | null;
}

export interface ReviewListParams {
  page?: number;
  limit?: number;
  sort?: string;
  assignment?: string;
  status?: SubmissionStatus | '';
}

export interface MySubmissionsParams {
  page?: number;
  limit?: number;
  sort?: string;
  assignment?: string;
}

export interface GradeInput {
  criterionScores?: Record<string, number>;
  score?: number;
  feedback?: string;
}

export interface CreateSubmissionInput {
  assignment: string;
  code: string;
  language: SubmissionLanguage;
}

export interface RunResult {
  jobId: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | string;
  submission: Pick<Submission, 'status' | 'runStatus' | 'runMessage' | 'totalScore' | 'maxScore' | 'testResults'>;
}

/** Display name of a populated user, falling back to the email. */
export const personName = (person: Submission['student'] | null | undefined) =>
  !person || typeof person === 'string' ? '—' : person.displayName || person.email;

/** Same formula as the backend (BE/src/services/grading.service.ts). */
export const computeRubricScore = (criteria: { score: number; maxScore: number; weight: number }[], assignmentMax: number) => {
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return 0;
  return Math.round((criteria.reduce((sum, c) => sum + (c.score / c.maxScore) * c.weight, 0) / totalWeight) * assignmentMax);
};

export interface Progress {
  attempts: number;
  status: 'not_started' | 'submitted' | 'graded';
  bestScore?: number;
}

const assignmentIdOf = (s: Submission) => (s.assignment && typeof s.assignment === 'object' ? s.assignment._id : s.assignment);

/** Attempts, best finalized score and overall status per assignment. */
export const progressByAssignment = (submissions: Submission[]) => {
  const map = new Map<string, Progress>();
  for (const s of submissions) {
    const id = assignmentIdOf(s);
    if (!id) continue;
    const p = map.get(id) ?? { attempts: 0, status: 'submitted' as const };
    p.attempts += 1;
    if (s.status === 'graded') {
      p.status = 'graded';
      p.bestScore = Math.max(p.bestScore ?? 0, s.score ?? 0);
    }
    map.set(id, p);
  }
  return map;
};
