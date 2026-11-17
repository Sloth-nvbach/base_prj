export const ASSIGNMENT_STATUSES = ['draft', 'published', 'closed'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  instructions: string;
  createdBy: string;
  dueDate?: string;
  maxScore: number;
  status: AssignmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentInput {
  title: string;
  description?: string;
  instructions?: string;
  dueDate?: string;
  maxScore?: number;
  status?: AssignmentStatus;
}

export interface UpdateAssignmentInput {
  title?: string;
  description?: string;
  instructions?: string;
  dueDate?: string | null;
  maxScore?: number;
  status?: AssignmentStatus;
}

export interface AssignmentListParams {
  page?: number;
  limit?: number;
  q?: string;
  status?: AssignmentStatus | '';
  sort?: string;
}