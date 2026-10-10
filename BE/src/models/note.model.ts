// Reference module: copy this file when creating a new resource (or run `npm run gen:module <name>`).
import mongoose, { Schema, Types } from 'mongoose';

export interface NoteDocument extends mongoose.Document {
  title: string;
  content: string;
  tags: string[];
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const noteSchema = new Schema<NoteDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, default: '', maxlength: 5000 },
    tags: { type: [String], default: [] },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Matches the default list query: one owner's notes, newest first.
noteSchema.index({ owner: 1, createdAt: -1 });

export const NoteModel = mongoose.model<NoteDocument>('Note', noteSchema);
