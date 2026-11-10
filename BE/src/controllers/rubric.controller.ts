import { Request, Response } from 'express';
import * as rubricService from '../services/rubric.service';
import { CreateRubricInput, UpdateRubricInput, ListRubricsQuery } from '../validators/rubric.validator';

const actorOf = (req: Request): rubricService.Actor => ({ id: req.user!.sub, role: req.user!.role });

export const listRubrics = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListRubricsQuery;
  res.json(await rubricService.listRubrics(actorOf(req), query));
};

export const getRubric = async (req: Request, res: Response) => {
  // Get assignmentId from route params (for /assignment/:assignmentId)
  const assignmentId = req.params.assignmentId as string;
  if (assignmentId) {
    res.json(await rubricService.getRubric(actorOf(req), assignmentId));
  } else {
    res.json(await rubricService.getRubricById(actorOf(req), req.params.id as string));
  }
};

export const createOrUpdateRubric = async (req: Request, res: Response) => {
  const assignmentId = req.params.assignmentId as string;
  const rubric = await rubricService.createOrUpdateRubric(actorOf(req), assignmentId, req.body as CreateRubricInput);
  res.status(201).json(rubric);
};

export const updateRubric = async (req: Request, res: Response) => {
  res.json(await rubricService.updateRubric(actorOf(req), req.params.id as string, req.body as UpdateRubricInput));
};

export const deleteRubric = async (req: Request, res: Response) => {
  await rubricService.deleteRubric(actorOf(req), req.params.id as string);
  res.status(204).end();
};

export const getDefaultRubric = async (_req: Request, res: Response) => {
  res.json(rubricService.getDefaultRubric());
};