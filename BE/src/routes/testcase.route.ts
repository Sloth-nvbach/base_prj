import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import { listTestCases, getTestCase, createTestCase, createTestCasesBulk, updateTestCase, deleteTestCase, reorderTestCases } from '../controllers/testcase.controller';
import { listTestResults, getTestResult } from '../controllers/testcase.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { objectIdSchema } from '../validators/common.validator';
import { createTestCaseSchema, listTestCasesQuerySchema, updateTestCaseSchema } from '../validators/testcase.validator';
import { listTestResultsQuerySchema } from '../validators/testcase.validator';

const assignmentIdParamsSchema = z.object({ assignmentId: objectIdSchema });
const idParamsSchema = z.object({ id: objectIdSchema });
const testCaseIdsBodySchema = z.object({ testCaseIds: z.array(objectIdSchema).min(1) });
const bulkTestCasesBodySchema = z.array(createTestCaseSchema).min(1);

export const testcaseRouter = Router();

testcaseRouter.use(authGuard);

// Reading: all signed-in roles (students see non-hidden test cases for published assignments)
// Writing: teachers and admins only
const read: RequestHandler[] = [requireRole('student', 'teacher', 'admin')];
const write: RequestHandler[] = [requireRole('teacher', 'admin')];

/** TestCase routes */
testcaseRouter.get('/', read, validate({ query: listTestCasesQuerySchema }), listTestCases);
testcaseRouter.get('/:id', read, validate({ params: idParamsSchema }), getTestCase);
testcaseRouter.post('/assignment/:assignmentId', write, validate({ params: assignmentIdParamsSchema, body: createTestCaseSchema }), createTestCase);
testcaseRouter.post('/assignment/:assignmentId/bulk', write, validate({ params: assignmentIdParamsSchema, body: bulkTestCasesBodySchema }), createTestCasesBulk);
testcaseRouter.patch('/:id', write, validate({ params: idParamsSchema, body: updateTestCaseSchema }), updateTestCase);
testcaseRouter.delete('/:id', write, validate({ params: idParamsSchema }), deleteTestCase);
testcaseRouter.post('/assignment/:assignmentId/reorder', write, validate({ params: assignmentIdParamsSchema, body: testCaseIdsBodySchema }), reorderTestCases);

/** TestResult routes (read-only) */
testcaseRouter.get('/results', read, validate({ query: listTestResultsQuerySchema }), listTestResults);
testcaseRouter.get('/results/:id', read, validate({ params: idParamsSchema }), getTestResult);