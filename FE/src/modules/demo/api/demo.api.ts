import { http } from '@/shared/api/http';
import type { Paginated } from '@/shared/api/types';
import type { DemoAssignment, DemoResult, DemoSubmission } from '../types/demo.types';

/**
 * Sprint-demo calls. The two list reads resolve with the list body like every
 * other module; each action resolves with `{ label, status, data }` so the page
 * can show the raw HTTP answer — that is the point of this module.
 */
export const demoApi = {
  // Assignments (DSE-14/16)
  listAssignments: () =>
    http.get<Paginated<DemoAssignment>>('/assignments', { params: { limit: 50 } }).then((r) => r.data),
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

  // Submissions (DSE-17/18/19)
  listSubmissions: () =>
    http.get<Paginated<DemoSubmission>>('/submissions', { params: { limit: 20 } }).then((r) => r.data),
  createSubmission: (input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post('/submissions', input).then((r) => ({ status: r.status, data: r.data })),

  // Courses (DSE-49)
  listCourses: () =>
    http.get<Paginated<unknown>>('/courses', { params: { limit: 50 } }).then((r) => r.data),
  getCourse: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/courses/${id}`).then((r) => ({ status: r.status, data: r.data })),
  createCourse: (input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post('/courses', input).then((r) => ({ status: r.status, data: r.data })),
  updateCourse: (id: string, input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.patch(`/courses/${id}`, input).then((r) => ({ status: r.status, data: r.data })),
  deleteCourse: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.delete(`/courses/${id}`).then((r) => ({ status: r.status, data: r.data ?? null })),

  // Classes (DSE-50)
  listClasses: () =>
    http.get<Paginated<unknown>>('/classes', { params: { limit: 50 } }).then((r) => r.data),
  getClass: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/classes/${id}`).then((r) => ({ status: r.status, data: r.data })),
  createClass: (input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post('/classes', input).then((r) => ({ status: r.status, data: r.data })),
  updateClass: (id: string, input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.patch(`/classes/${id}`, input).then((r) => ({ status: r.status, data: r.data })),
  deleteClass: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.delete(`/classes/${id}`).then((r) => ({ status: r.status, data: r.data ?? null })),

  // Enrollments (DSE-50)
  listEnrollments: () =>
    http.get<Paginated<unknown>>('/enrollments', { params: { limit: 50 } }).then((r) => r.data),
  getEnrollment: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/enrollments/${id}`).then((r) => ({ status: r.status, data: r.data })),
  enrollStudent: (input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post('/enrollments', input).then((r) => ({ status: r.status, data: r.data })),
  updateEnrollment: (id: string, input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.patch(`/enrollments/${id}`, input).then((r) => ({ status: r.status, data: r.data })),
  deleteEnrollment: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.delete(`/enrollments/${id}`).then((r) => ({ status: r.status, data: r.data ?? null })),

  // Rubrics (DSE-51)
  listRubrics: () =>
    http.get<Paginated<unknown>>('/rubrics', { params: { limit: 50 } }).then((r) => r.data),
  getRubric: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/rubrics/${id}`).then((r) => ({ status: r.status, data: r.data })),
  getRubricByAssignment: (assignmentId: string): Promise<Omit<DemoResult, 'label'>> =>
    http.get(`/rubrics/assignment/${assignmentId}`).then((r) => ({ status: r.status, data: r.data })),
  getDefaultRubric: (): Promise<Omit<DemoResult, 'label'>> =>
    http.get('/rubrics/default').then((r) => ({ status: r.status, data: r.data })),
  createOrUpdateRubric: (assignmentId: string, input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.post(`/rubrics/assignment/${assignmentId}`, input).then((r) => ({ status: r.status, data: r.data })),
  updateRubric: (id: string, input: Record<string, unknown>): Promise<Omit<DemoResult, 'label'>> =>
    http.patch(`/rubrics/${id}`, input).then((r) => ({ status: r.status, data: r.data })),
  deleteRubric: (id: string): Promise<Omit<DemoResult, 'label'>> =>
    http.delete(`/rubrics/${id}`).then((r) => ({ status: r.status, data: r.data ?? null })),
};
