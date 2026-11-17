import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { Rubric, CreateRubricInput, UpdateRubricInput, RubricListParams, CriterionInput } from '../types/rubric.types';

const cleanParams = (params: object) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const rubricApi = {
  list: (params: RubricListParams = {}) =>
    http.get<Paginated<Rubric>>('/rubrics', { params: cleanParams(params) }).then((r) => r.data),

  getByAssignment: (assignmentId: string) =>
    http.get<Rubric>(`/rubrics/assignment/${assignmentId}`).then((r) => r.data),

  getById: (id: string) =>
    http.get<Rubric>(`/rubrics/${id}`).then((r) => r.data),

  createOrUpdate: (assignmentId: string, input: CreateRubricInput | UpdateRubricInput) =>
    http.post<Rubric>(`/rubrics/assignment/${assignmentId}`, input).then((r) => r.data),

  update: (id: string, input: UpdateRubricInput) =>
    http.patch<Rubric>(`/rubrics/${id}`, input).then((r) => r.data),

  remove: (id: string) =>
    http.delete(`/rubrics/${id}`).then(() => undefined),

  getDefault: () =>
    http.get<{ criteria: CriterionInput[] }>('/rubrics/default').then((r) => r.data),

  copyFromAssignment: (assignmentId: string, sourceAssignmentId: string) =>
    http.post<Rubric>(`/rubrics/assignment/${assignmentId}/copy`, { sourceAssignmentId }).then((r) => r.data),
};