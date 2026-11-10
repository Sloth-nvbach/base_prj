import mongoose, { Schema, Types } from 'mongoose';

/** Programming languages accepted for submissions. Extend the list when support grows. */
export const SUBMISSION_LANGUAGES = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c'] as const;
export type SubmissionLanguage = (typeof SUBMISSION_LANGUAGES)[number];

/** A submission starts as 'submitted' and becomes 'graded' once the teacher confirms a score. */
export const SUBMISSION_STATUSES = ['submitted', 'graded'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

/** Individual test result embedded in submission for quick access. */
export interface SubmissionTestResult {
  testCaseId: Types.ObjectId;
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedMB: number;
  points: number; // points earned for this test case
}

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
  /** Test case results (embedded for quick access; TestResult collection is source of truth). */
  testResults: SubmissionTestResult[];
  /** Sum of points from all test cases (auto-graded). */
  totalScore?: number;
  /** Maximum possible score from all test cases. */
  maxScore?: number;
  /** When the submission was graded (auto or manual). */
  gradedAt?: Date;
  /** Who graded the submission (teacher/admin). */
  gradedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const submissionTestResultSchema = new Schema<SubmissionTestResult>(
  {
    testCaseId: { type: Schema.Types.ObjectId, ref: 'TestCase', required: true },
    passed: { type: Boolean, required: true },
    stdout: { type: String, default: '', maxlength: 50000 },
    stderr: { type: String, default: '', maxlength: 50000 },
    exitCode: { type: Number, required: true },
    executionTimeMs: { type: Number, required: true, min: 0 },
    memoryUsedMB: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

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
    feedback: { type: String, default: '', maxlength: 5000 },
    testResults: { type: [submissionTestResultSchema], default: [] },
    totalScore: { type: Number, min: 0 },
    maxScore: { type: Number, min: 0 },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: 'User' }
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
// For grading workflows: find submissions pending grading
submissionSchema.index({ assignment: 1, status: 1 });

export const SubmissionModel = mongoose.model<SubmissionDocument>('Submission', submissionSchema);