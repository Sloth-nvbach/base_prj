import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { DemoAssignment, DemoResult, DemoSubmission } from '../types/demo.types';

/**
 * Sprint-demo calls. The two list reads resolve with the list body like every
 * other module; each action resolves with `{ label, status, data }` so the page
 * can show the raw HTTP answer — that is the point of this module.
 */
export const demoApi = {
  listAssignments: () =>
    http.get<Paginated<DemoAssignment>>('/assignments', { params: { limit: 50 } }).then((r) => r.data),
  listSubmissions: () =>
    http.get<Paginated<DemoSubmission>>('/submissions', { params: { limit: 20 } }).then((r) => r.data),

  getAssignment: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/assignments/${id}`).then((r) => ({ status: r.status, data: r.data })),
  createAssignment: (input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post('/assignments', input).then((r) => ({ status: r.status, data: r.data })),
  updateAssignment: (id: string, input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.patch(`/assignments/${id}`, input).then((r) => ({ status: r.status, data: r.data })),
  deleteAssignment: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.delete(`/assignments/${id}`).then((r) => ({ status: r.status, data: r.data ?? null })),
  checkSubmissionAccess: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/assignments/${id}/submission-access`).then((r) => ({ status: r.status, data: r.data })),
  createSubmission: (input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post('/submissions', input).then((r) => ({ status: r.status, data: r.data })),
};
