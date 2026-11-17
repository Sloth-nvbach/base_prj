import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/shared/api/api-error';
import { demoApi } from '../api/demo.api';
import type { DemoResult } from '../types/demo.types';

/** Cache keys of the lists shown on the demo page. */
export const demoKeys = {
  all: ['demo'] as const,
  assignments: ['demo', 'assignments'] as const,
  submissions: ['demo', 'submissions'] as const,
  courses: ['demo', 'courses'] as const,
  classes: ['demo', 'classes'] as const,
  enrollments: ['demo', 'enrollments'] as const,
  rubrics: ['demo', 'rubrics'] as const
};

/** The axios error of a refused request, as a demo result (status 0 = never reached the server). */
const errorToResult = (label: string, error: unknown): DemoResult => {
  const refused = error as { response?: { status?: number; data?: unknown } };
  return { label, status: refused?.response?.status ?? 0, data: refused?.response?.data ?? null };
};

/**
 * One demo action = one button on the page. It reports the raw HTTP answer
 * (status + body, refused requests included) to `onResult`, toasts, and
 * refreshes the given list keys. Because `onError` is set, the shared query
 * client skips its own toast — so it is shown here.
 */
const useDemoAction = <TVariables>(
  label: string,
  action: (variables: TVariables) => Promise<Omit<DemoResult, 'label'>>,
  onResult: (result: DemoResult) => void,
  { successMessage, invalidate }: { successMessage?: string; invalidate?: readonly (readonly unknown[])[] } = {}
) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: action,
    onSuccess: (result) => {
      if (successMessage) toast.success(successMessage);
      onResult({ label, ...result });
      return Promise.all(
        (invalidate ?? []).map((key) => queryClient.invalidateQueries({ queryKey: key }))
      );
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Request failed'));
      onResult(errorToResult(label, error));
    }
  });
};

// Assignment list queries
export const useDemoAssignments = () =>
  useQuery({ queryKey: demoKeys.assignments, queryFn: demoApi.listAssignments });

export const useDemoSubmissions = () =>
  useQuery({ queryKey: demoKeys.submissions, queryFn: demoApi.listSubmissions });

export const useDemoCourses = () =>
  useQuery({ queryKey: demoKeys.courses, queryFn: demoApi.listCourses });

export const useDemoClasses = () =>
  useQuery({ queryKey: demoKeys.classes, queryFn: demoApi.listClasses });

export const useDemoEnrollments = () =>
  useQuery({ queryKey: demoKeys.enrollments, queryFn: demoApi.listEnrollments });

export const useDemoRubrics = () =>
  useQuery({ queryKey: demoKeys.rubrics, queryFn: demoApi.listRubrics });

// DSE-14/16: assignment management.
export const useDemoGetAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/assignments/:id', demoApi.getAssignment, onResult);

export const useDemoCreateAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/assignments', demoApi.createAssignment, onResult, {
    successMessage: 'Assignment created.',
    invalidate: [demoKeys.assignments]
  });

export const useDemoUpdateAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'PATCH /api/assignments/:id',
    ({ id, input }: { id: string; input: Record<string, unknown> }) => demoApi.updateAssignment(id, input),
    onResult,
    { successMessage: 'Assignment updated.', invalidate: [demoKeys.assignments] }
  );

export const useDemoDeleteAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('DELETE /api/assignments/:id', demoApi.deleteAssignment, onResult, {
    successMessage: 'Assignment deleted.',
    invalidate: [demoKeys.assignments]
  });

// DSE-19: can the current account submit right now?
export const useDemoCheckAccess = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/assignments/:id/submission-access', demoApi.checkSubmissionAccess, onResult);

// DSE-17: submit code; DSE-18: the history list.
export const useDemoSubmit = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/submissions', demoApi.createSubmission, onResult, {
    successMessage: 'Code submitted.',
    invalidate: [demoKeys.submissions]
  });

// DSE-49: Course CRUD
export const useDemoGetCourse = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/courses/:id', demoApi.getCourse, onResult);

export const useDemoCreateCourse = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/courses', demoApi.createCourse, onResult, {
    successMessage: 'Course created.',
    invalidate: [demoKeys.courses]
  });

export const useDemoUpdateCourse = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'PATCH /api/courses/:id',
    ({ id, input }: { id: string; input: Record<string, unknown> }) => demoApi.updateCourse(id, input),
    onResult,
    { successMessage: 'Course updated.', invalidate: [demoKeys.courses] }
  );

export const useDemoDeleteCourse = (onResult: (result: DemoResult) => void) =>
  useDemoAction('DELETE /api/courses/:id', demoApi.deleteCourse, onResult, {
    successMessage: 'Course deleted.',
    invalidate: [demoKeys.courses]
  });

// DSE-50: Class CRUD
export const useDemoGetClass = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/classes/:id', demoApi.getClass, onResult);

export const useDemoCreateClass = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/classes', demoApi.createClass, onResult, {
    successMessage: 'Class created.',
    invalidate: [demoKeys.classes]
  });

export const useDemoUpdateClass = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'PATCH /api/classes/:id',
    ({ id, input }: { id: string; input: Record<string, unknown> }) => demoApi.updateClass(id, input),
    onResult,
    { successMessage: 'Class updated.', invalidate: [demoKeys.classes] }
  );

export const useDemoDeleteClass = (onResult: (result: DemoResult) => void) =>
  useDemoAction('DELETE /api/classes/:id', demoApi.deleteClass, onResult, {
    successMessage: 'Class deleted.',
    invalidate: [demoKeys.classes]
  });

// DSE-50: Enrollment CRUD
export const useDemoEnrollStudent = (onResult: (result: DemoResult) => void) =>
  useDemoAction('POST /api/enrollments', demoApi.enrollStudent, onResult, {
    successMessage: 'Enrolled.',
    invalidate: [demoKeys.enrollments, demoKeys.classes]
  });

export const useDemoUpdateEnrollment = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'PATCH /api/enrollments/:id',
    ({ id, input }: { id: string; input: Record<string, unknown> }) => demoApi.updateEnrollment(id, input),
    onResult,
    { successMessage: 'Enrollment updated.', invalidate: [demoKeys.enrollments] }
  );

export const useDemoDeleteEnrollment = (onResult: (result: DemoResult) => void) =>
  useDemoAction('DELETE /api/enrollments/:id', demoApi.deleteEnrollment, onResult, {
    successMessage: 'Enrollment deleted.',
    invalidate: [demoKeys.enrollments]
  });

// DSE-51: Rubric CRUD
export const useDemoGetRubric = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/rubrics/:id', demoApi.getRubric, onResult);

export const useDemoGetRubricByAssignment = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'GET /api/rubrics/assignment/:assignmentId',
    (assignmentId: string) => demoApi.getRubricByAssignment(assignmentId),
    onResult
  );

export const useDemoGetDefaultRubric = (onResult: (result: DemoResult) => void) =>
  useDemoAction('GET /api/rubrics/default', demoApi.getDefaultRubric, onResult);

export const useDemoCreateOrUpdateRubric = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'POST /api/rubrics/assignment/:assignmentId',
    ({ assignmentId, input }: { assignmentId: string; input: Record<string, unknown> }) => demoApi.createOrUpdateRubric(assignmentId, input),
    onResult,
    { successMessage: 'Rubric created/updated.', invalidate: [demoKeys.rubrics] }
  );

export const useDemoUpdateRubric = (onResult: (result: DemoResult) => void) =>
  useDemoAction(
    'PATCH /api/rubrics/:id',
    ({ id, input }: { id: string; input: Record<string, unknown> }) => demoApi.updateRubric(id, input),
    onResult,
    { successMessage: 'Rubric updated.', invalidate: [demoKeys.rubrics] }
  );

export const useDemoDeleteRubric = (onResult: (result: DemoResult) => void) =>
  useDemoAction('DELETE /api/rubrics/:id', demoApi.deleteRubric, onResult, {
    successMessage: 'Rubric deleted.',
    invalidate: [demoKeys.rubrics]
  });
