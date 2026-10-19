import { Request, Response } from 'express';
import * as assignmentService from '../services/assignment.service';
import * as submissionService from '../services/submission.service';
import { CreateAssignmentInput, ListAssignmentsQuery, UpdateAssignmentInput } from '../validators/assignment.validator';

// `authGuard` + `requireRole` run first, so `req.user` (with role) is always set here.
const actorOf = (req: Request): assignmentService.Actor => ({ id: req.user!.sub, role: req.user!.role });

export const listAssignments = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListAssignmentsQuery;
  res.json(await assignmentService.listAssignments(actorOf(req), query));
};

export const getAssignment = async (req: Request, res: Response) => {
  res.json(await assignmentService.getAssignment(actorOf(req), req.params.id as string));
};

export const getSubmissionAccess = async (req: Request, res: Response) => {
  res.json(await submissionService.checkSubmissionAccess(actorOf(req), req.params.id as string));
};

export const createAssignment = async (req: Request, res: Response) => {
  const assignment = await assignmentService.createAssignment(actorOf(req), req.body as CreateAssignmentInput);
  res.status(201).json(assignment);
};

export const updateAssignment = async (req: Request, res: Response) => {
  res.json(await assignmentService.updateAssignment(actorOf(req), req.params.id as string, req.body as UpdateAssignmentInput));
};

export const deleteAssignment = async (req: Request, res: Response) => {
  await assignmentService.deleteAssignment(actorOf(req), req.params.id as string);
  res.status(204).end();
};
