import mongoose, { Schema, Types } from 'mongoose';

/** Lifecycle of an assignment: drafts are not visible to students until published; closed stops submissions. */
export const ASSIGNMENT_STATUSES = ['draft', 'published', 'closed'] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export interface AssignmentDocument extends mongoose.Document {
  title: string;
  description: string;
  instructions: string;
  createdBy: Types.ObjectId;
  /** Optional: assignments without a deadline accept submissions indefinitely. */
  dueDate?: Date;
  maxScore: number;
  status: AssignmentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<AssignmentDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, default: '', maxlength: 5000 },
    instructions: { type: String, default: '', maxlength: 10000 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dueDate: { type: Date },
    maxScore: { type: Number, required: true, default: 100, min: 0 },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: 'draft' }
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

// Default query: one teacher's assignments, newest first. The compound index
// also serves queries on createdBy alone, so no separate field index is needed.
assignmentSchema.index({ createdBy: 1, createdAt: -1 });

export const AssignmentModel = mongoose.model<AssignmentDocument>('Assignment', assignmentSchema);
