import { AssignmentModel } from '../models/assignment.model';
import { SubmissionModel } from '../models/submission.model';
import { forbidden, notFound } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateSubmissionInput, ListSubmissionsQuery } from '../validators/submission.validator';

/** Who is making the request. Only students (role 'user') may submit. */
export interface Actor {
  id: string;
  role?: string;
}

const isStudent = (actor: Actor) => actor.role === 'user';

export type SubmissionAccess = { canSubmit: true } | { canSubmit: false; reason: string };

/**
 * DSE-19: the one place that decides whether a submission would be accepted
 * right now. Draft assignments answer 404 so their existence stays hidden;
 * every other refusal carries a reason. `POST /api/submissions` and
 * `GET /api/assignments/:id/submission-access` share this logic, so clients
 * cannot bypass it.
 */
const submissionAccess = async (actor: Actor, assignmentId: string): Promise<SubmissionAccess> => {
  const assignment = await AssignmentModel.findById(assignmentId);
  if (!assignment || assignment.status === 'draft') throw notFound('Assignment not found');
  if (!isStudent(actor)) return { canSubmit: false, reason: 'Only students can submit' };
  if (assignment.status === 'closed') return { canSubmit: false, reason: 'Assignment is closed for submissions' };
  if (assignment.dueDate && assignment.dueDate.getTime() < Date.now()) {
    return { canSubmit: false, reason: 'Deadline has passed' };
  }
  return { canSubmit: true };
};

/** Same rules as a submit attempt, but as an answer instead of an error. */
export const checkSubmissionAccess = (actor: Actor, assignmentId: string) => submissionAccess(actor, assignmentId);

export const createSubmission = async (actor: Actor, input: CreateSubmissionInput) => {
  const access = await submissionAccess(actor, input.assignment);
  if (!access.canSubmit) throw forbidden(access.reason);
  return SubmissionModel.create({ ...input, student: actor.id });
};

/** The caller's own submissions only; other people's submissions answer nothing. */
export const listSubmissions = (actor: Actor, { assignment, ...pagination }: ListSubmissionsQuery) =>
  paginate(SubmissionModel, { student: actor.id, ...(assignment ? { assignment } : {}) }, pagination);
