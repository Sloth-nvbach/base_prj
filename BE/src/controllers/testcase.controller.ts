import { Request, Response } from 'express';
import * as testcaseService from '../services/testcase.service';
import { CreateTestCaseInput, UpdateTestCaseInput, ListTestCasesQuery, ListTestResultsQuery } from '../validators/testcase.validator';

const actorOf = (req: Request): testcaseService.Actor => ({ id: req.user!.sub, role: req.user!.role });

/** TestCase controllers */
export const listTestCases = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTestCasesQuery;
  res.json(await testcaseService.listTestCases(actorOf(req), query));
};

export const getTestCase = async (req: Request, res: Response) => {
  res.json(await testcaseService.getTestCase(actorOf(req), req.params.id as string));
};

export const createTestCase = async (req: Request, res: Response) => {
  const assignmentId = req.params.assignmentId as string;
  const testCase = await testcaseService.createTestCase(actorOf(req), assignmentId, req.body as CreateTestCaseInput);
  res.status(201).json(testCase);
};

export const createTestCasesBulk = async (req: Request, res: Response) => {
  const assignmentId = req.params.assignmentId as string;
  const testCases = await testcaseService.createTestCasesBulk(actorOf(req), assignmentId, req.body as CreateTestCaseInput[]);
  res.status(201).json(testCases);
};

export const updateTestCase = async (req: Request, res: Response) => {
  res.json(await testcaseService.updateTestCase(actorOf(req), req.params.id as string, req.body as UpdateTestCaseInput));
};

export const deleteTestCase = async (req: Request, res: Response) => {
  await testcaseService.deleteTestCase(actorOf(req), req.params.id as string);
  res.status(204).end();
};

export const reorderTestCases = async (req: Request, res: Response) => {
  const assignmentId = req.params.assignmentId as string;
  const { testCaseIds } = req.body as { testCaseIds: string[] };
  res.json(await testcaseService.reorderTestCases(actorOf(req), assignmentId, testCaseIds));
};


/** TestResult controllers (read-only) */
export const listTestResults = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListTestResultsQuery;
  res.json(await testcaseService.listTestResults(actorOf(req), query));
};

export const getTestResult = async (req: Request, res: Response) => {
  res.json(await testcaseService.getTestResult(actorOf(req), req.params.id as string));
};