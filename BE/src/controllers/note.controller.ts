// Reference module: copy this file when creating a new resource (or run `npm run gen:module <name>`).
import { Request, Response } from 'express';
import * as noteService from '../services/note.service';
import { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from '../validators/note.validator';

// `authGuard` + `requireRole` run first, so `req.user` (with role) is always set here.
const actorOf = (req: Request): noteService.Actor => ({ id: req.user!.sub, role: req.user!.role });

export const listNotes = async (req: Request, res: Response) => {
  const query = req.query as unknown as ListNotesQuery;
  res.json(await noteService.listNotes(actorOf(req), query));
};

export const getNote = async (req: Request, res: Response) => {
  res.json(await noteService.getNote(actorOf(req), req.params.id as string));
};

export const createNote = async (req: Request, res: Response) => {
  const note = await noteService.createNote(actorOf(req), req.body as CreateNoteInput);
  res.status(201).json(note);
};

export const updateNote = async (req: Request, res: Response) => {
  res.json(await noteService.updateNote(actorOf(req), req.params.id as string, req.body as UpdateNoteInput));
};

export const deleteNote = async (req: Request, res: Response) => {
  await noteService.deleteNote(actorOf(req), req.params.id as string);
  res.status(204).end();
};
