import { Request, Response } from 'express';
import * as submissionService from '../services/submission.service';
import { CreateSubmissionInput, ListSubmissionsQuery } from '../validators/submission.validator';

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
