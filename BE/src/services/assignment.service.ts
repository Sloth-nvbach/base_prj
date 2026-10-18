import type { QueryFilter } from 'mongoose';
import { AssignmentDocument, AssignmentModel } from '../models/assignment.model';
import { notFound } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateAssignmentInput, ListAssignmentsQuery, UpdateAssignmentInput } from '../validators/assignment.validator';

/** Who is making the request. Admins may manage every assignment. */
export interface Actor {
  id: string;
  role?: string;
}

const isAdmin = (actor: Actor) => actor.role === 'admin';
const isTeacher = (actor: Actor) => actor.role === 'teacher';

/**
 * Filter limiting a read to the assignments the actor may see. Students see
 * every assignment that is no longer a draft (published and closed), from any
 * teacher; teachers see their own, drafts included; admins see everything.
 */
const readFilter = (actor: Actor): QueryFilter<AssignmentDocument> => {
  if (isAdmin(actor)) return {};
  if (isTeacher(actor)) return { createdBy: actor.id };
  return { status: { $ne: 'draft' } };
};

/**
 * Filter for writes (update, delete). Teachers may touch their own assignments
 * only. Another teacher's assignment answers 404 (not 403) so its existence is
 * never revealed.
 */
const writeFilter = (actor: Actor, id?: string) => ({
  ...(id ? { _id: id } : {}),
  ...(isAdmin(actor) ? {} : { createdBy: actor.id })
});

export const listAssignments = (actor: Actor, pagination: ListAssignmentsQuery) =>
  paginate(AssignmentModel, readFilter(actor), pagination);

export const getAssignment = async (actor: Actor, id: string) => {
  const assignment = await AssignmentModel.findOne({ ...readFilter(actor), _id: id });
  if (!assignment) throw notFound('Assignment not found');
  return assignment;
};

export const createAssignment = (actor: Actor, input: CreateAssignmentInput) =>
  AssignmentModel.create({ ...input, createdBy: actor.id });

export const updateAssignment = async (actor: Actor, id: string, input: UpdateAssignmentInput) => {
  const assignment = await AssignmentModel.findOneAndUpdate(writeFilter(actor, id), input, {
    returnDocument: 'after',
    runValidators: true
  });
  if (!assignment) throw notFound('Assignment not found');
  return assignment;
};

export const deleteAssignment = async (actor: Actor, id: string) => {
  const assignment = await AssignmentModel.findOneAndDelete(writeFilter(actor, id));
  if (!assignment) throw notFound('Assignment not found');
};
