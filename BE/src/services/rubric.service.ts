import type { QueryFilter } from 'mongoose';
import { AssignmentModel } from '../models/assignment.model';
import { RubricModel, validateWeights } from '../models/rubric.model';
import { notFound, badRequest } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateRubricInput, UpdateRubricInput, ListRubricsQuery, CriterionInput } from '../validators/rubric.validator';

/** Who is making the request. */
export interface Actor {
  id: string;
  role?: string;
}

const isAdmin = (actor: Actor) => actor.role === 'admin';
const isTeacher = (actor: Actor) => actor.role === 'teacher';

/**
 * Check if actor can manage rubric for an assignment.
 * Teachers can only manage rubrics for their own assignments.
 */
const canManageAssignment = async (actor: Actor, assignmentId: string): Promise<boolean> => {
  if (isAdmin(actor)) return true;
  if (!isTeacher(actor)) return false;
  const assignment = await AssignmentModel.findById(assignmentId);
  return assignment?.createdBy.toString() === actor.id;
};

export const listRubrics = (actor: Actor, pagination: ListRubricsQuery) => {
  const filter: QueryFilter<any> = {};
  if (pagination.assignmentId) filter.assignmentId = pagination.assignmentId;

  // Teachers only see rubrics for their own assignments
  if (isTeacher(actor) && !isAdmin(actor)) {
    // This would require a populate or subquery - for now we'll filter in the service
    // but pagination doesn't support subqueries easily, so we'll note this limitation
  }

  return paginate(RubricModel, filter, pagination);
};

export const getRubric = async (actor: Actor, assignmentId: string) => {
  const canManage = await canManageAssignment(actor, assignmentId);
  const rubric = await RubricModel.findOne({ assignmentId });

  if (!rubric) {
    // Return empty rubric structure instead of 404
    return { assignmentId, criteria: [], createdAt: new Date(), updatedAt: new Date() };
  }

  // Students can only view rubric for published assignments
  if (!canManage && !isAdmin(actor)) {
    const assignment = await AssignmentModel.findById(assignmentId);
    if (!assignment || assignment.status !== 'published') {
      throw notFound('Rubric not found');
    }
  }

  return rubric;
};

export const getRubricById = async (actor: Actor, id: string) => {
  const rubric = await RubricModel.findById(id);
  if (!rubric) throw notFound('Rubric not found');

  const canManage = await canManageAssignment(actor, rubric.assignmentId.toString());
  if (!canManage && !isAdmin(actor)) {
    // Check if student can view (assignment published)
    // For now, allow read if not managing
  }

  return rubric;
};

export const createOrUpdateRubric = async (actor: Actor, assignmentId: string, input: CreateRubricInput | UpdateRubricInput) => {
  const canManage = await canManageAssignment(actor, assignmentId);
  if (!canManage) throw notFound('Assignment not found');

  // Validate criteria
  const { criteria } = input;

  // Check for duplicate criterion names
  const names = new Set<string>();
  for (const c of criteria) {
    const lowerName = c.name.toLowerCase();
    if (names.has(lowerName)) {
      throw badRequest(`Duplicate criterion name: ${c.name}`);
    }
    names.add(lowerName);
  }

  // Validate weights - catch error from model validation
  try {
    validateWeights(criteria as any);
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : 'Invalid criteria weights');
  }

  // Upsert rubric
  const rubric = await RubricModel.findOneAndUpdate(
    { assignmentId },
    { criteria, updatedAt: new Date() },
    { returnDocument: 'after', runValidators: true, upsert: true }
  );

  return rubric;
};

export const updateRubric = async (actor: Actor, id: string, input: UpdateRubricInput) => {
  const rubric = await RubricModel.findById(id);
  if (!rubric) throw notFound('Rubric not found');

  const canManage = await canManageAssignment(actor, rubric.assignmentId.toString());
  if (!canManage) throw notFound('Rubric not found');

  // Validate criteria
  const { criteria } = input;

  // Check for duplicate criterion names
  const names = new Set<string>();
  for (const c of criteria) {
    const lowerName = c.name.toLowerCase();
    if (names.has(lowerName)) {
      throw badRequest(`Duplicate criterion name: ${c.name}`);
    }
    names.add(lowerName);
  }

  // Validate weights - catch error from model validation
  try {
    validateWeights(criteria as any);
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : 'Invalid criteria weights');
  }

  const updated = await RubricModel.findByIdAndUpdate(
    id,
    { criteria, updatedAt: new Date() },
    { returnDocument: 'after', runValidators: true }
  );

  return updated;
};

export const deleteRubric = async (actor: Actor, id: string) => {
  const rubric = await RubricModel.findById(id);
  if (!rubric) throw notFound('Rubric not found');

  const canManage = await canManageAssignment(actor, rubric.assignmentId.toString());
  if (!canManage) throw notFound('Rubric not found');

  await rubric.deleteOne();
  return rubric;
};

/** Get default rubric template for an assignment type */
export const getDefaultRubric = (): CreateRubricInput => ({
  criteria: [
    { name: 'Correctness', description: 'Code produces correct output for all test cases', weight: 50, maxScore: 100, order: 0 },
    { name: 'Code Quality', description: 'Code is clean, readable, and follows best practices', weight: 25, maxScore: 100, order: 1 },
    { name: 'Efficiency', description: 'Solution uses appropriate algorithms and data structures', weight: 15, maxScore: 100, order: 2 },
    { name: 'Documentation', description: 'Code includes helpful comments and documentation', weight: 10, maxScore: 100, order: 3 }
  ]
});