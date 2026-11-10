/**
 * Test case and grading result models.
 * DSE-20: Thiết kế dữ liệu bộ kiểm thử và kết quả chấm
 * DSE-21: Giảng viên thiết lập bộ kiểm thử cho bài tập
 */
import mongoose, { Schema, Types } from 'mongoose';

/** Test case for an assignment. */
export interface TestCaseDocument extends mongoose.Document {
  assignmentId: Types.ObjectId;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  order: number;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

const testCaseSchema = new Schema<TestCaseDocument>(
  {
    assignmentId: { type: Schema.Types.ObjectId, ref: 'Assignment', required: true },
    input: { type: String, required: true, maxlength: 10000 },
    expectedOutput: { type: String, required: true, maxlength: 10000 },
    isHidden: { type: Boolean, required: true, default: false },
    order: { type: Number, required: true, min: 0 },
    points: { type: Number, required: true, min: 1, max: 100 }
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

// Indexes for query patterns
testCaseSchema.index({ assignmentId: 1, order: 1 });
testCaseSchema.index({ assignmentId: 1, isHidden: 1 });

export const TestCaseModel = mongoose.model<TestCaseDocument>('TestCase', testCaseSchema);


/** Result of running a test case against a submission. */
export interface TestResultDocument extends mongoose.Document {
  submissionId: Types.ObjectId;
  testCaseId: Types.ObjectId;
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedMB: number;
  createdAt: Date;
  updatedAt: Date;
}

const testResultSchema = new Schema<TestResultDocument>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    testCaseId: { type: Schema.Types.ObjectId, ref: 'TestCase', required: true },
    passed: { type: Boolean, required: true },
    stdout: { type: String, default: '', maxlength: 50000 },
    stderr: { type: String, default: '', maxlength: 50000 },
    exitCode: { type: Number, required: true },
    executionTimeMs: { type: Number, required: true, min: 0 },
    memoryUsedMB: { type: Number, required: true, min: 0 }
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

// Indexes for query patterns
testResultSchema.index({ submissionId: 1, testCaseId: 1 }, { unique: true });
testResultSchema.index({ submissionId: 1 });
testResultSchema.index({ testCaseId: 1 });

export const TestResultModel = mongoose.model<TestResultDocument>('TestResult', testResultSchema);