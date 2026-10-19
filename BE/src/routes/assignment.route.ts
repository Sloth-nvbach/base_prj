import { Router, RequestHandler } from 'express';
import { createAssignment, deleteAssignment, getAssignment, getSubmissionAccess, listAssignments, updateAssignment } from '../controllers/assignment.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createAssignmentSchema, listAssignmentsQuerySchema, updateAssignmentSchema } from '../validators/assignment.validator';

export const assignmentRouter = Router();

// Reading (list, detail) is open to every signed-in role: students see what
// has been published, teachers see their own drafts. Writing (create, edit,
// delete) is for teachers and admins only.
const read: RequestHandler[] = [authGuard, requireRole('student', 'teacher', 'admin')];
const write: RequestHandler[] = [authGuard, requireRole('teacher', 'admin')];

assignmentRouter.get('/', ...read, validate({ query: listAssignmentsQuerySchema }), listAssignments);
assignmentRouter.get('/:id', ...read, validate({ params: idParamsSchema }), getAssignment);
// DSE-19: whether the current user may submit to this assignment right now.
assignmentRouter.get('/:id/submission-access', ...read, validate({ params: idParamsSchema }), getSubmissionAccess);
assignmentRouter.post('/', ...write, validate({ body: createAssignmentSchema }), createAssignment);
assignmentRouter.patch('/:id', ...write, validate({ params: idParamsSchema, body: updateAssignmentSchema }), updateAssignment);
assignmentRouter.delete('/:id', ...write, validate({ params: idParamsSchema }), deleteAssignment);
