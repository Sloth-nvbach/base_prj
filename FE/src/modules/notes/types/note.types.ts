// Reference module: copy this folder when creating a new feature (or run `npm run gen:module <name>`).
export interface Note {
  _id: string;
  title: string;
  content: string;
  tags: string[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteInput {
  title: string;
  content: string;
  tags: string[];
}

export interface NoteListParams {
  page?: number;
  limit?: number;
  q?: string;
  tag?: string;
  /** Admins only: include every user's notes. */
  all?: boolean;
}
