import { beforeEach, describe, expect, it } from 'vitest';
import { AssignmentModel } from '../../src/models/assignment.model';
import type { AssignmentDocument } from '../../src/models/assignment.model';
import { SubmissionModel } from '../../src/models/submission.model';
import type { UserDocument } from '../../src/models/user.model';
import { createUser } from '../helpers/user-factory';

// Creates submissions straight through the model (not the API) so the schema
// itself is what gets exercised. Assignment and student come from real
// documents so the ObjectId references are exercised too.
let teacher: UserDocument;
let student: UserDocument;
let assignment: AssignmentDocument;

beforeEach(async () => {
  teacher = await createUser({ email: 'teacher@example.com', role: 'teacher' });
  student = await createUser({ email: 'student@example.com', role: 'user' });
  assignment = await AssignmentModel.create({ title: 'Loop exercises', createdBy: teacher._id });
});

const createSubmission = (overrides: Record<string, unknown> = {}) =>
  SubmissionModel.create({
    assignment: assignment._id,
    student: student._id,
    code: 'console.log("hello world");',
    ...overrides
  });

describe('Submission model', () => {
  describe('valid data', () => {
    it('saves a submission with sensible defaults', async () => {
      const submission = await createSubmission();

      expect(submission.language).toBe('javascript');
      expect(submission.status).toBe('submitted');
      expect(submission.submittedAt).toBeInstanceOf(Date);
      expect(submission.feedback).toBe('');
      expect(submission.score).toBeUndefined();
      expect(submission.createdAt).toBeInstanceOf(Date);
      expect(submission.updatedAt).toBeInstanceOf(Date);
    });

    it('accepts an explicit language from the supported list', async () => {
      const submission = await createSubmission({ language: 'python' });

      expect(submission.language).toBe('python');
    });
  });

  describe('invalid data', () => {
    it('rejects a missing code', async () => {
      await expect(createSubmission({ code: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing assignment reference', async () => {
      await expect(createSubmission({ assignment: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing student reference', async () => {
      await expect(createSubmission({ student: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects an unsupported language', async () => {
      await expect(createSubmission({ language: 'brainfuck' })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a status outside the allowed list', async () => {
      await expect(createSubmission({ status: 'pending' })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a negative score on create', async () => {
      await expect(createSubmission({ score: -5 })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a negative score on update', async () => {
      const submission = await createSubmission();

      await expect(
        SubmissionModel.findByIdAndUpdate(submission._id, { score: -1 }, { returnDocument: 'after', runValidators: true })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('submission history', () => {
    it('keeps several submissions from the same student for the same assignment', async () => {
      await createSubmission({ code: 'console.log("first");' });
      await createSubmission({ code: 'console.log("second");' });
      await createSubmission({ code: 'console.log("third");' });

      await expect(
        SubmissionModel.countDocuments({ assignment: assignment._id, student: student._id })
      ).resolves.toBe(3);
    });

    it('keeps the original submission time when a teacher grades later', async () => {
      const submission = await createSubmission();
      const submittedAt = submission.submittedAt;

      const graded = await SubmissionModel.findByIdAndUpdate(
        submission._id,
        { score: 85, feedback: 'Good work', status: 'graded' },
        { returnDocument: 'after', runValidators: true }
      );

      expect(graded!.score).toBe(85);
      expect(graded!.feedback).toBe('Good work');
      expect(graded!.status).toBe('graded');
      expect(graded!.submittedAt).toEqual(submittedAt);
    });
  });

  describe('references', () => {
    it('resolves assignment and student references', async () => {
      const submission = await createSubmission();
      const populated = await SubmissionModel.findById(submission._id).populate('assignment').populate('student');

      expect(populated!.assignment).toMatchObject({ title: 'Loop exercises' });
      expect(populated!.student).toMatchObject({ email: 'student@example.com' });
    });
  });

  it('strips __v from JSON responses', async () => {
    const submission = await createSubmission();
    const json = submission.toJSON() as Record<string, unknown>;

    expect(json.code).toBe('console.log("hello world");');
    expect(json).not.toHaveProperty('__v');
  });
});
