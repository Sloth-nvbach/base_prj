import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { listRubrics, getRubric, createOrUpdateRubric, updateRubric, deleteRubric, getDefaultRubric } from '../controllers/rubric.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { objectIdSchema } from '../validators/common.validator';
import { createRubricSchema, listRubricsQuerySchema, updateRubricSchema } from '../validators/rubric.validator';

const assignmentIdParamsSchema = z.object({ assignmentId: objectIdSchema });

export const rubricRouter = Router();

rubricRouter.use(authGuard);

// Reading: all signed-in roles (students see rubric for published assignments)
// Writing: teachers and admins only
const read: RequestHandler[] = [requireRole('student', 'teacher', 'admin')];
const write: RequestHandler[] = [requireRole('teacher', 'admin')];

/** Rubric routes */
rubricRouter.get('/', read, validate({ query: listRubricsQuerySchema }), listRubrics);
rubricRouter.get('/default', read, getDefaultRubric);
rubricRouter.get('/assignment/:assignmentId', read, validate({ params: assignmentIdParamsSchema }), getRubric);
rubricRouter.get('/:id', read, validate({ params: z.object({ id: objectIdSchema }) }), getRubric);
rubricRouter.post('/assignment/:assignmentId', write, validate({ params: assignmentIdParamsSchema, body: createRubricSchema }), createOrUpdateRubric);
rubricRouter.patch('/:id', write, validate({ params: z.object({ id: objectIdSchema }), body: updateRubricSchema }), updateRubric);
rubricRouter.delete('/:id', write, validate({ params: z.object({ id: objectIdSchema }) }), deleteRubric);