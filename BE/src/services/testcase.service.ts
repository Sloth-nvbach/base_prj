import type { QueryFilter } from 'mongoose';
import { AssignmentModel } from '../models/assignment.model';
import { TestCaseModel } from '../models/testcase.model';
import { TestResultModel } from '../models/testcase.model';
import { notFound, badRequest } from '../utils/app-error';
import { paginate } from '../utils/pagination';
import { CreateTestCaseInput, UpdateTestCaseInput, ListTestCasesQuery, ListTestResultsQuery } from '../validators/testcase.validator';

/** Who is making the request. */
export interface Actor {
  id: string;
  role?: string;
}

const isAdmin = (actor: Actor) => actor.role === 'admin';
const isTeacher = (actor: Actor) => actor.role === 'teacher';

/**
 * Check if actor can manage test cases for an assignment.
 * Teachers can only manage test cases for their own assignments.
 */
const canManageAssignment = async (actor: Actor, assignmentId: string): Promise<boolean> => {
  if (isAdmin(actor)) return true;
  if (!isTeacher(actor)) return false;
  const assignment = await AssignmentModel.findById(assignmentId);
  return assignment?.createdBy.toString() === actor.id;
};

export const listTestCases = async (actor: Actor, pagination: ListTestCasesQuery) => {
  const filter: QueryFilter<any> = {};

  if (pagination.assignmentId) {
    const canManage = await canManageAssignment(actor, pagination.assignmentId);
    if (!canManage && !isAdmin(actor)) {
      // Students can only see non-hidden test cases for published assignments
      const assignment = await AssignmentModel.findById(pagination.assignmentId);
      if (!assignment || assignment.status !== 'published') {
        throw notFound('Assignment not found');
      }
      filter.isHidden = false;
    }
    filter.assignmentId = pagination.assignmentId;
  }

  if (pagination.isHidden !== undefined) filter.isHidden = pagination.isHidden;

  return paginate(TestCaseModel, filter, pagination);
};

export const getTestCase = async (actor: Actor, id: string) => {
  const testCase = await TestCaseModel.findById(id);
  if (!testCase) throw notFound('Test case not found');

  const canManage = await canManageAssignment(actor, testCase.assignmentId.toString());
  if (!canManage && !isAdmin(actor)) {
    // Students can only see test cases for published assignments
    const assignment = await AssignmentModel.findById(testCase.assignmentId);
    if (!assignment || assignment.status !== 'published') {
      throw notFound('Test case not found');
    }
    // Also check if test case is hidden
    if (testCase.isHidden) {
      throw notFound('Test case not found');
    }
  } else if (!canManage && testCase.isHidden) {
    throw notFound('Test case not found');
  }

  return testCase;
};

export const createTestCase = async (actor: Actor, assignmentId: string, input: CreateTestCaseInput) => {
  const canManage = await canManageAssignment(actor, assignmentId);
  if (!canManage) throw notFound('Assignment not found');

  // Get the next order if not provided (default is 0 from validator)
  let order = input.order ?? 0;
  if (order === 0) {
    const lastCase = await TestCaseModel.findOne({ assignmentId }).sort({ order: -1 });
    order = (lastCase?.order ?? -1) + 1;
  }

  return TestCaseModel.create({ ...input, assignmentId, order });
};

export const createTestCasesBulk = async (actor: Actor, assignmentId: string, inputs: CreateTestCaseInput[]) => {
  const canManage = await canManageAssignment(actor, assignmentId);
  if (!canManage) throw notFound('Assignment not found');

  // Get starting order
  const lastCase = await TestCaseModel.findOne({ assignmentId }).sort({ order: -1 });
  let order = (lastCase?.order ?? -1) + 1;

  const testCases = inputs.map((input, index) => ({
    ...input,
    assignmentId,
    order: input.order ?? order + index
  }));

  return TestCaseModel.insertMany(testCases);
};

export const updateTestCase = async (actor: Actor, id: string, input: UpdateTestCaseInput) => {
  const testCase = await TestCaseModel.findById(id);
  if (!testCase) throw notFound('Test case not found');

  const canManage = await canManageAssignment(actor, testCase.assignmentId.toString());
  if (!canManage) throw notFound('Test case not found');

  const updated = await TestCaseModel.findByIdAndUpdate(id, input, {
    returnDocument: 'after',
    runValidators: true
  });

  return updated;
};

export const deleteTestCase = async (actor: Actor, id: string) => {
  const testCase = await TestCaseModel.findById(id);
  if (!testCase) throw notFound('Test case not found');

  const canManage = await canManageAssignment(actor, testCase.assignmentId.toString());
  if (!canManage) throw notFound('Test case not found');

  await testCase.deleteOne();

  // Reorder remaining test cases
  await TestCaseModel.updateMany(
    { assignmentId: testCase.assignmentId, order: { $gt: testCase.order } },
    { $inc: { order: -1 } }
  );

  return testCase;
};

export const reorderTestCases = async (actor: Actor, assignmentId: string, testCaseIds: string[]) => {
  const canManage = await canManageAssignment(actor, assignmentId);
  if (!canManage) throw notFound('Assignment not found');

  const bulkOps = testCaseIds.map((id, index) => ({
    updateOne: {
      filter: { _id: id, assignmentId },
      update: { order: index }
    }
  }));

  await TestCaseModel.bulkWrite(bulkOps);

  return TestCaseModel.find({ assignmentId }).sort({ order: 1 });
};


/** Test Results (read-only, created by grading system) */
export const listTestResults = (actor: Actor, pagination: ListTestResultsQuery) => {
  const filter: QueryFilter<any> = {};

  if (pagination.submissionId) filter.submissionId = pagination.submissionId;
  if (pagination.testCaseId) filter.testCaseId = pagination.testCaseId;
  if (pagination.passed !== undefined) filter.passed = pagination.passed;

  return paginate(TestResultModel, filter, pagination);
};

export const getTestResult = async (actor: Actor, id: string) => {
  const result = await TestResultModel.findById(id);
  if (!result) throw notFound('Test result not found');
  return result;
};

export const createTestResult = async (input: {
  submissionId: string;
  testCaseId: string;
  passed: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  memoryUsedMB: number;
}) => {
  return TestResultModel.create(input);
};