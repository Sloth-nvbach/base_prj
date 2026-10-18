import mongoose, { Schema, Types } from 'mongoose';

/** Programming languages accepted for submissions. Extend the list when support grows. */
export const SUBMISSION_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'] as const;
export type SubmissionLanguage = (typeof SUBMISSION_LANGUAGES)[number];

/** A submission starts as 'submitted' and becomes 'graded' once the teacher confirms a score. */
export const SUBMISSION_STATUSES = ['submitted', 'graded'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

export interface SubmissionDocument extends mongoose.Document {
  assignment: Types.ObjectId;
  student: Types.ObjectId;
  code: string;
  language: SubmissionLanguage;
  submittedAt: Date;
  status: SubmissionStatus;
  /**
   * Final score confirmed by the teacher, empty until graded. Never write
   * AI-suggested scores here; those belong to their own fields when AI support
   * is added. The upper bound (<= assignment.maxScore) is a grading-workflow
   * rule enforced by the service that saves the score, not by this schema.
   */
  score?: number;
  feedback: string;
  createdAt: Date;
  updatedAt: Date;
}

const submissionSchema = new Schema<SubmissionDocument>(
  {
    assignment: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // Loose cap aligned with the ~100 kB JSON body limit, so the model never
    // stores code the API would reject anyway.
    code: { type: String, required: true, maxlength: 100000 },
    language: { type: String, enum: SUBMISSION_LANGUAGES, default: 'javascript' },
    submittedAt: { type: Date, required: true, default: () => new Date() },
    status: { type: String, enum: SUBMISSION_STATUSES, default: 'submitted' },
    score: { type: Number, min: 0 },
    feedback: { type: String, default: '', maxlength: 5000 }
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

// Default query: one student's submissions for one assignment, newest first.
// Deliberately not unique: students may submit several times and the history is kept.
submissionSchema.index({ assignment: 1, student: 1, createdAt: -1 });

export const SubmissionModel = mongoose.model<SubmissionDocument>('Submission', submissionSchema);
