import { Router, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { aiReviewConfig } from '../config/ai-review';
import { createSubmission, listSubmissions, runSubmission, getSubmissionRunResult, listForReview, getSubmissionDetail, gradeSubmission, finalizeSubmission, reviewSubmissionWithAi } from '../controllers/submission.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createSubmissionSchema, listSubmissionsQuerySchema, runSubmissionSchema, getRunResultQuerySchema, reviewListQuerySchema, gradeSubmissionSchema } from '../validators/submission.validator';

export const submissionRouter = Router();

// Only students submit. Every signed-in role may read its own submission
// history (teachers and admins simply have none).
const read: RequestHandler[] = [authGuard, requireRole('student', 'teacher', 'admin')];
const write: RequestHandler[] = [authGuard, requireRole('student')];
const staff: RequestHandler[] = [authGuard, requireRole('teacher', 'admin')];

submissionRouter.get('/', ...read, validate({ query: listSubmissionsQuerySchema }), listSubmissions);
submissionRouter.post('/', ...write, validate({ body: createSubmissionSchema }), createSubmission);

// DSE-38/23/24/26: grading (teachers own assignments, admins all). '/review' must stay before '/:id'.
submissionRouter.get('/review', ...staff, validate({ query: reviewListQuerySchema }), listForReview);
submissionRouter.get('/:id', ...read, validate({ params: idParamsSchema }), getSubmissionDetail);
submissionRouter.post('/:id/grade', ...staff, validate({ params: idParamsSchema, body: gradeSubmissionSchema }), gradeSubmission);
submissionRouter.post('/:id/finalize', ...staff, validate({ params: idParamsSchema }), finalizeSubmission);

// DSE-32/33: AI review, limited per teacher because the free Gemini quota is small.
const aiReviewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: aiReviewConfig.perMinuteLimit,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user!.sub,
  message: { message: 'Too many AI reviews. Wait a minute and try again.' }
});
submissionRouter.post('/:id/ai-review', ...staff, aiReviewLimiter, validate({ params: idParamsSchema }), reviewSubmissionWithAi);

// DSE-22: Run submission against test cases (students only)
submissionRouter.post('/:id/run', ...write, validate({ params: idParamsSchema, body: runSubmissionSchema }), runSubmission);
submissionRouter.get('/:id/run-result', ...read, validate({ params: idParamsSchema, query: getRunResultQuerySchema }), getSubmissionRunResult);
