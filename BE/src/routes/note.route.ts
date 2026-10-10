// Reference module: copy this file when creating a new resource (or run `npm run gen:module <name>`).
import { Router } from 'express';
import { createNote, deleteNote, getNote, listNotes, updateNote } from '../controllers/note.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { requireRole } from '../middlewares/role.middleware';
import { validate } from '../middlewares/validate.middleware';
import { idParamsSchema } from '../validators/common.validator';
import { createNoteSchema, listNotesQuerySchema, updateNoteSchema } from '../validators/note.validator';

export const noteRouter = Router();

// Every note endpoint needs a signed-in user; `requireRole` also loads the role.
noteRouter.use(authGuard, requireRole('user', 'admin'));

noteRouter.get('/', validate({ query: listNotesQuerySchema }), listNotes);
noteRouter.get('/:id', validate({ params: idParamsSchema }), getNote);
noteRouter.post('/', validate({ body: createNoteSchema }), createNote);
noteRouter.patch('/:id', validate({ params: idParamsSchema, body: updateNoteSchema }), updateNote);
noteRouter.delete('/:id', validate({ params: idParamsSchema }), deleteNote);
