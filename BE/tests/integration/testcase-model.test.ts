import { beforeEach, describe, expect, it } from 'vitest';
import { TestCaseModel, TestResultModel } from '../../src/models/testcase.model';
import type { UserDocument } from '../../src/models/user.model';
import { AssignmentModel } from '../../src/models/assignment.model';
import { SubmissionModel } from '../../src/models/submission.model';
import { createUser } from '../helpers/user-factory';

let teacher: UserDocument;
let student: UserDocument;
let assignmentId: string;
let submissionId: string;

beforeEach(async () => {
  teacher = await createUser({ email: 'teacher@example.com', role: 'teacher' });
  student = await createUser({ email: 'student@example.com', role: 'student' });
  const assignment = await AssignmentModel.create({ title: 'Loop exercises', createdBy: teacher._id });
  assignmentId = assignment._id.toString();

  const submission = await SubmissionModel.create({
    assignment: assignmentId,
    student: student._id,
    code: 'console.log("hello");',
    language: 'javascript'
  });
  submissionId = submission._id.toString();
});

const createTestCase = (overrides: Record<string, unknown> = {}) =>
  TestCaseModel.create({
    assignmentId,
    input: '1\n2\n',
    expectedOutput: '3\n',
    isHidden: false,
    order: 0,
    points: 10,
    ...overrides
  });

describe('TestCase model', () => {
  describe('valid data', () => {
    it('saves a test case with sensible defaults', async () => {
      const tc = await createTestCase();

      expect(tc.assignmentId.toString()).toBe(assignmentId);
      expect(tc.input).toBe('1\n2\n');
      expect(tc.expectedOutput).toBe('3\n');
      expect(tc.isHidden).toBe(false);
      expect(tc.order).toBe(0);
      expect(tc.points).toBe(10);
      expect(tc.createdAt).toBeInstanceOf(Date);
    });

    it('accepts explicit values for optional fields', async () => {
      const tc = await createTestCase({
        input: '5\n',
        expectedOutput: '120\n',
        isHidden: true,
        order: 5,
        points: 20
      });

      expect(tc.isHidden).toBe(true);
      expect(tc.order).toBe(5);
      expect(tc.points).toBe(20);
    });
  });

  describe('invalid data', () => {
    it('rejects a missing assignmentId', async () => {
      await expect(TestCaseModel.create({
        input: '1\n', expectedOutput: '2\n'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects empty input', async () => {
      await expect(TestCaseModel.create({
        assignmentId, input: '', expectedOutput: '2\n'
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects empty expectedOutput', async () => {
      await expect(TestCaseModel.create({
        assignmentId, input: '1\n', expectedOutput: ''
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects points < 1', async () => {
      await expect(TestCaseModel.create({
        assignmentId, input: '1\n', expectedOutput: '2\n', points: 0
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects points > 100', async () => {
      await expect(TestCaseModel.create({
        assignmentId, input: '1\n', expectedOutput: '2\n', points: 101
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects order < 0', async () => {
      await expect(TestCaseModel.create({
        assignmentId, input: '1\n', expectedOutput: '2\n', order: -1
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('indexes', () => {
    it('has compound index on assignmentId + order', async () => {
      await createTestCase({ order: 2 });
      await createTestCase({ order: 0 });
      await createTestCase({ order: 1 });

      const cases = await TestCaseModel.find({ assignmentId }).sort({ order: 1 });
      expect(cases.length).toBe(3);
      expect(cases[0].order).toBe(0);
      expect(cases[1].order).toBe(1);
      expect(cases[2].order).toBe(2);
    });

    it('has index on assignmentId + isHidden', async () => {
      await createTestCase({ isHidden: true, order: 0 });
      await createTestCase({ isHidden: false, order: 1 });

      const hidden = await TestCaseModel.find({ assignmentId, isHidden: true });
      expect(hidden.length).toBe(1);
    });
  });

  it('strips __v from JSON responses', async () => {
    const tc = await createTestCase();
    const json = tc.toJSON() as Record<string, unknown>;
    expect(json.input).toBe('1\n2\n');
    expect(json).not.toHaveProperty('__v');
  });
});

describe('TestResult model', () => {
  let testCaseId: string;

  beforeEach(async () => {
    const tc = await createTestCase();
    testCaseId = tc._id.toString();
  });

  describe('valid data', () => {
    it('saves a test result', async () => {
      const result = await TestResultModel.create({
        submissionId,
        testCaseId,
        passed: true,
        stdout: '3\n',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 45,
        memoryUsedMB: 12.5
      });

      expect(result.submissionId.toString()).toBe(submissionId);
      expect(result.testCaseId.toString()).toBe(testCaseId);
      expect(result.passed).toBe(true);
      expect(result.stdout).toBe('3\n');
      expect(result.exitCode).toBe(0);
      expect(result.executionTimeMs).toBe(45);
      expect(result.memoryUsedMB).toBe(12.5);
      expect(result.createdAt).toBeInstanceOf(Date);
    });

    it('accepts failed test case', async () => {
      const result = await TestResultModel.create({
        submissionId,
        testCaseId,
        passed: false,
        stdout: '4\n',
        stderr: '',
        exitCode: 0,
        executionTimeMs: 30,
        memoryUsedMB: 10
      });

      expect(result.passed).toBe(false);
      expect(result.stdout).toBe('4\n');
    });
  });

  describe('invalid data', () => {
    it('rejects missing submissionId', async () => {
      await expect(TestResultModel.create({
        testCaseId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects missing testCaseId', async () => {
      await expect(TestResultModel.create({
        submissionId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects missing passed', async () => {
      await expect(TestResultModel.create({
        submissionId, testCaseId, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects negative executionTimeMs', async () => {
      await expect(TestResultModel.create({
        submissionId, testCaseId, passed: true, exitCode: 0, executionTimeMs: -1, memoryUsedMB: 5
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects negative memoryUsedMB', async () => {
      await expect(TestResultModel.create({
        submissionId, testCaseId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: -1
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('unique indexes', () => {
    it('enforces unique submissionId + testCaseId', async () => {
      await TestResultModel.create({
        submissionId, testCaseId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
      });
      await expect(TestResultModel.create({
        submissionId, testCaseId, passed: false, exitCode: 1, executionTimeMs: 20, memoryUsedMB: 6
      })).rejects.toMatchObject({ name: 'MongoServerError', code: 11000 });
    });
  });

  describe('indexes', () => {
    it('has index on submissionId', async () => {
      await TestResultModel.create({
        submissionId, testCaseId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
      });

      const results = await TestResultModel.find({ submissionId });
      expect(results.length).toBe(1);
    });

    it('has index on testCaseId', async () => {
      await TestResultModel.create({
        submissionId, testCaseId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
      });

      const results = await TestResultModel.find({ testCaseId });
      expect(results.length).toBe(1);
    });
  });

  it('strips __v from JSON responses', async () => {
    const result = await TestResultModel.create({
      submissionId, testCaseId, passed: true, exitCode: 0, executionTimeMs: 10, memoryUsedMB: 5
    });
    const json = result.toJSON() as Record<string, unknown>;
    expect(json.passed).toBe(true);
    expect(json).not.toHaveProperty('__v');
  });
});