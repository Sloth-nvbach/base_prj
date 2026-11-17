import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { Assignment, CreateAssignmentInput, UpdateAssignmentInput, AssignmentListParams } from '../types/assignment.types';

const cleanParams = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const assignmentApi = {
  list: (params: AssignmentListParams = {}) =>
    http.get<Paginated<Assignment>>('/assignments', { params: cleanParams(params) }).then((r) => r.data),

  get: (id: string) =>
    http.get<Assignment>(`/assignments/${id}`).then((r) => r.data),

  create: (input: CreateAssignmentInput) =>
    http.post<Assignment>('/assignments', input).then((r) => r.data),

  update: (id: string, input: UpdateAssignmentInput) =>
    http.patch<Assignment>(`/assignments/${id}`, input).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/assignments/${id}`).then(() => undefined),

  getSubmissionAccess: (id: string) =>
    http.get<{ canSubmit: boolean; reason?: string }>(`/assignments/${id}/submission-access`).then((r) => r.data),
};