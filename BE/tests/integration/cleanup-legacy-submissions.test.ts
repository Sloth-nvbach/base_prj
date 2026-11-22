import { describe, expect, it } from 'vitest';
import { Types } from 'mongoose';
import { SubmissionModel } from '../../src/models/submission.model';
import { cleanupLegacySubmissions } from '../../src/scripts/cleanup-legacy-submissions';

const base = () => ({
  assignment: new Types.ObjectId(),
  student: new Types.ObjectId(),
  code: 'print(1)',
  language: 'python',
  submittedAt: new Date(),
  testResults: [],
  createdAt: new Date(),
  updatedAt: new Date()
});

describe('cleanupLegacySubmissions', () => {
  it('turns worker-made "graded"/"failed" submissions back into submitted ones, keeps real grades', async () => {
    const { insertedIds } = await SubmissionModel.collection.insertMany([
      { ...base(), status: 'graded', feedback: 'Code executed successfully', gradedAt: new Date() },
      { ...base(), status: 'failed', feedback: 'Execution failed (compile or runtime error)', gradedAt: new Date() },
      { ...base(), status: 'graded', score: 7, feedback: 'Teacher feedback', gradedAt: new Date() },
      { ...base(), status: 'submitted', feedback: '' }
    ]);

    expect(await cleanupLegacySubmissions()).toBe(2);
    const [autoGraded, failed, realGrade, untouched] = await Promise.all(
      Object.values(insertedIds).map((id) => SubmissionModel.findById(id))
    );

    expect(autoGraded).toMatchObject({ status: 'submitted', feedback: '', runStatus: 'completed', runMessage: 'Code executed successfully' });
    expect(autoGraded!.gradedAt).toBeUndefined();
    expect(failed).toMatchObject({ status: 'submitted', feedback: '', runStatus: 'error' });
    expect(realGrade).toMatchObject({ status: 'graded', score: 7, feedback: 'Teacher feedback' });
    expect(untouched).toMatchObject({ status: 'submitted' });

    expect(await cleanupLegacySubmissions()).toBe(0); // idempotent
  });
});
