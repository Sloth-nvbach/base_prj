/** Assignment as returned by `GET /api/assignments` (DSE-14/16). */
export interface DemoAssignment {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  status: 'draft' | 'published' | 'closed';
  maxScore: number;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** One row of `GET /api/submissions` — the assignment is populated (DSE-18), null when it was deleted. */
export interface DemoSubmission {
  _id: string;
  assignment: Pick<DemoAssignment, '_id' | 'title' | 'status' | 'maxScore' | 'dueDate'> | null;
  student: string;
  code: string;
  language: string;
  submittedAt: string;
  status: 'submitted' | 'graded';
  score?: number;
  feedback: string;
  createdAt: string;
}

/** Course as returned by `GET /api/courses` (DSE-49). */
export interface DemoCourse {
  _id: string;
  title: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** Class as returned by `GET /api/classes` (DSE-50). */
export interface DemoClass {
  _id: string;
  courseId: { _id: string; title: string } | string;
  name: string;
  schedule: string;
  enrollCode: string;
  maxStudents: number;
  currentStudents?: number;
  status: 'planned' | 'active' | 'completed';
  teacherId: { _id: string; email: string } | string;
  createdAt: string;
  updatedAt: string;
}

/** Enrollment as returned by `GET /api/enrollments` (DSE-50). */
export interface DemoEnrollment {
  _id: string;
  classId: { _id: string; name: string } | string;
  studentId: { _id: string; email: string } | string;
  role: 'student' | 'ta';
  status: 'active' | 'dropped' | 'completed';
  enrolledAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Rubric as returned by `GET /api/rubrics` (DSE-51). */
export interface DemoRubric {
  _id: string;
  assignmentId: { _id: string; title: string } | string;
  criteria: Array<{
    name: string;
    description: string;
    weight: number;
    maxScore: number;
    order: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

/** Languages accepted by `POST /api/submissions`. Keep in sync with BE SUBMISSION_LANGUAGES. */
export const DEMO_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'] as const;

/** Answer of one demo action: shown in the result card, errors included. */
export interface DemoResult {
  /** The request that ran, e.g. `POST /api/assignments`. */
  label: string;
  /** 0 when the request never reached the server (network error). */
  status: number;
  data: unknown;
}
