import { Router, RequestHandler } from 'express';
import { createSubmission, listSubmissions } from '../controllers/submission.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { createSubmissionSchema, listSubmissionsQuerySchema } from '../validators/submission.validator';

export const submissionRouter = Router();

// Only students submit. Every signed-in role may read its own submission
// history (teachers and admins simply have none).
const read: RequestHandler[] = [authGuard, requireRole('user', 'teacher', 'admin')];
const write: RequestHandler[] = [authGuard, requireRole('user')];

submissionRouter.get('/', ...read, validate({ query: listSubmissionsQuerySchema }), listSubmissions);
submissionRouter.post('/', ...write, validate({ body: createSubmissionSchema }), createSubmission);
