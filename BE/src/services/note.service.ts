// Reference module: copy this file when creating a new resource (or run `npm run gen:module <name>`).
import type { QueryFilter } from 'mongoose';
import { NoteDocument, NoteModel } from '../models/note.model';
import { notFound } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateNoteInput, ListNotesQuery, UpdateNoteInput } from '../validators/note.validator';

/** Who is making the request. Admins may see and change every note. */
export interface Actor {
  id: string;
  role?: string;
}

const isAdmin = (actor: Actor) => actor.role === 'admin';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Filter that limits a query to notes the actor may touch. Another user's note
 * answers 404 (not 403) so ids of other people's notes are not revealed.
 */
const accessFilter = (actor: Actor, id?: string) => ({
  ...(id ? { _id: id } : {}),
  ...(isAdmin(actor) ? {} : { owner: actor.id })
});

export const listNotes = (actor: Actor, { q, tag, all, ...pagination }: ListNotesQuery) => {
  const filter: QueryFilter<NoteDocument> = all && isAdmin(actor) ? {} : { owner: actor.id };
  if (tag) filter.tags = tag;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: pattern }, { content: pattern }];
  }
  return paginate(NoteModel, filter, pagination);
};

export const getNote = async (actor: Actor, id: string) => {
  const note = await NoteModel.findOne(accessFilter(actor, id));
  if (!note) throw notFound('Note not found');
  return note;
};

export const createNote = (actor: Actor, input: CreateNoteInput) =>
  NoteModel.create({ ...input, owner: actor.id });

export const updateNote = async (actor: Actor, id: string, input: UpdateNoteInput) => {
  const note = await NoteModel.findOneAndUpdate(accessFilter(actor, id), input, {
    returnDocument: 'after',
    runValidators: true
  });
  if (!note) throw notFound('Note not found');
  return note;
};

export const deleteNote = async (actor: Actor, id: string) => {
  const note = await NoteModel.findOneAndDelete(accessFilter(actor, id));
  if (!note) throw notFound('Note not found');
};
