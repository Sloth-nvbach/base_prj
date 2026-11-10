import { beforeEach, describe, expect, it } from 'vitest';
import { RubricModel } from '../../src/models/rubric.model';
import type { UserDocument } from '../../src/models/user.model';
import { AssignmentModel } from '../../src/models/assignment.model';
import { createUser } from '../helpers/user-factory';

let teacher: UserDocument;
let assignmentId: string;

beforeEach(async () => {
  teacher = await createUser({ email: 'teacher@example.com', role: 'teacher' });
  const assignment = await AssignmentModel.create({ title: 'Loop exercises', createdBy: teacher._id });
  assignmentId = assignment._id.toString();
});

const createRubric = (overrides: Record<string, unknown> = {}) =>
  RubricModel.create({
    assignmentId,
    criteria: [
      { name: 'Correctness', description: 'Code works correctly', weight: 50, maxScore: 100, order: 0 },
      { name: 'Style', description: 'Code follows style guide', weight: 30, maxScore: 100, order: 1 },
      { name: 'Efficiency', description: 'Code is efficient', weight: 20, maxScore: 100, order: 2 }
    ],
    ...overrides
  });

describe('Rubric model', () => {
  describe('valid data', () => {
    it('saves a rubric with valid criteria', async () => {
      const rubric = await createRubric();

      expect(rubric.assignmentId.toString()).toBe(assignmentId);
      expect(rubric.criteria.length).toBe(3);
      expect(rubric.criteria[0].name).toBe('Correctness');
      expect(rubric.criteria[0].weight).toBe(50);
      expect(rubric.criteria[0].maxScore).toBe(100);
      expect(rubric.criteria[0].order).toBe(0);
      expect(rubric.createdAt).toBeInstanceOf(Date);
      expect(rubric.updatedAt).toBeInstanceOf(Date);
    });

    it('auto-normalizes weights to sum to 100', async () => {
      const rubric = await RubricModel.create({
        assignmentId,
        criteria: [
          { name: 'Correctness', weight: 40, maxScore: 100, order: 0 },
          { name: 'Style', weight: 30, maxScore: 100, order: 1 },
          { name: 'Efficiency', weight: 20, maxScore: 100, order: 2 }
        ]
      });

      // Weights sum to 90, should be normalized to 100
      const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBe(100);
      expect(rubric.criteria[0].weight).toBeCloseTo(44.44, 1);
      expect(rubric.criteria[1].weight).toBeCloseTo(33.33, 1);
      expect(rubric.criteria[2].weight).toBeCloseTo(22.22, 1);
    });

    it('accepts weights that already sum to 100', async () => {
      const rubric = await createRubric();
      const totalWeight = rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBe(100);
    });
  });

  describe('invalid data', () => {
    it('rejects a missing assignmentId', async () => {
      await expect(RubricModel.create({
        criteria: [{ name: 'Test', weight: 100, maxScore: 100, order: 0 }]
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects empty criteria array', async () => {
      await expect(RubricModel.create({ assignmentId, criteria: [] })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects criterion with missing name', async () => {
      await expect(RubricModel.create({
        assignmentId,
        criteria: [{ name: '', weight: 100, maxScore: 100, order: 0 }]
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects criterion with weight < 0', async () => {
      await expect(RubricModel.create({
        assignmentId,
        criteria: [{ name: 'Test', weight: -1, maxScore: 100, order: 0 }]
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects criterion with weight > 100', async () => {
      await expect(RubricModel.create({
        assignmentId,
        criteria: [{ name: 'Test', weight: 101, maxScore: 100, order: 0 }]
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects criterion with maxScore < 1', async () => {
      await expect(RubricModel.create({
        assignmentId,
        criteria: [{ name: 'Test', weight: 50, maxScore: 0, order: 0 }]
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects criterion with maxScore > 100', async () => {
      await expect(RubricModel.create({
        assignmentId,
        criteria: [{ name: 'Test', weight: 50, maxScore: 101, order: 0 }]
      })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects all weights zero', async () => {
      await expect(RubricModel.create({
        assignmentId,
        criteria: [
          { name: 'A', weight: 0, maxScore: 100, order: 0 },
          { name: 'B', weight: 0, maxScore: 100, order: 1 }
        ]
      })).rejects.toThrow('At least one criterion must have weight > 0');
    });
  });

  describe('unique indexes', () => {
    it('enforces unique assignmentId', async () => {
      await createRubric();
      await expect(createRubric()).rejects.toMatchObject({ name: 'MongoServerError', code: 11000 });
    });
  });

  it('strips __v from JSON responses', async () => {
    const rubric = await createRubric();
    const json = rubric.toJSON() as Record<string, unknown>;
    expect(json.assignmentId).toBe(assignmentId);
    expect(json).not.toHaveProperty('__v');
  });
});