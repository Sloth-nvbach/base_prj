export interface Criterion {
  _id: string;
  name: string;
  description: string;
  weight: number;
  maxScore: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CriterionInput {
  name: string;
  description?: string;
  weight: number;
  maxScore: number;
  order?: number;
}

export interface Rubric {
  _id: string;
  assignmentId: string;
  criteria: Criterion[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRubricInput {
  criteria: CriterionInput[];
}

export interface UpdateRubricInput {
  criteria: CriterionInput[];
}

export interface RubricListParams {
  page?: number;
  limit?: number;
  sort?: string;
  assignmentId?: string;
}