import { Request, Response } from 'express';
import * as submissionService from '../services/submission.service';
import { CreateSubmissionInput, ListSubmissionsQuery, RunSubmissionInput, GetRunResultQuery } from '../validators/submission.validator';

// `authGuard` + `requireRole` run first, so `req.user` (with role) is always set here.
const actorOf = (req: Request): submissionService.Actor => ({ id: req.user!.sub, role: req.user!.role });

export const listSubmissions = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListSubmissionsQuery;
  res.json(await submissionService.listSubmissions(actorOf(req), query));
};

export const createSubmission = async (req: Request, res: Response) => {
  const submission = await submissionService.createSubmission(actorOf(req), req.body as CreateSubmissionInput);
  res.status(201).json(submission);
};

/** DSE-22: POST /api/submissions/:id/run - Queue submission for execution. */
export const runSubmission = async (req: Request, res: Response) => {
  const result = await submissionService.runSubmission(actorOf(req), req.params.id as string, req.body as RunSubmissionInput);
  res.status(202).json(result);
};

/** DSE-22: GET /api/submissions/:id/run-result - Poll for execution result. */
export const getSubmissionRunResult = async (req: Request, res: Response) => {
  const query = req.query as unknown as GetRunResultQuery;
  const result = await submissionService.getSubmissionRunResult(actorOf(req), req.params.id as string, query.jobId);
  res.json(result);
};
