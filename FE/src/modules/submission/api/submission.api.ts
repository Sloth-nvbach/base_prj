import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type {
  AiReview,
  CreateSubmissionInput,
  GradeInput,
  MySubmissionsParams,
  ReviewListParams,
  RunResult,
  Submission,
  SubmissionDetail,
} from '../types/submission.types';

const cleanParams = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const submissionApi = {
  /** Student: own submissions. */
  listMine: (params: MySubmissionsParams = {}) =>
    http.get<Paginated<Submission>>('/submissions', { params: cleanParams(params) }).then((r) => r.data),
  /** Teacher/admin: grading queue. */
  listForReview: (params: ReviewListParams = {}) =>
    http.get<Paginated<Submission>>('/submissions/review', { params: cleanParams(params) }).then((r) => r.data),
  get: (id: string) => http.get<SubmissionDetail>(`/submissions/${id}`).then((r) => r.data),
  create: (input: CreateSubmissionInput) => http.post<Submission>('/submissions', input).then((r) => r.data),
  run: (id: string) => http.post<{ jobId: string }>(`/submissions/${id}/run`, {}).then((r) => r.data),
  runResult: (id: string, jobId: string) =>
    http.get<RunResult>(`/submissions/${id}/run-result`, { params: { jobId } }).then((r) => r.data),
  grade: (id: string, input: GradeInput) => http.post<Submission>(`/submissions/${id}/grade`, input).then((r) => r.data),
  finalize: (id: string) => http.post<Submission>(`/submissions/${id}/finalize`, {}).then((r) => r.data),
  aiReview: (id: string) => http.post<AiReview>(`/submissions/${id}/ai-review`, {}).then((r) => r.data),
};
