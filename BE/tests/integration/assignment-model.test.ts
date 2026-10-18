import { beforeEach, describe, expect, it } from 'vitest';
import { AssignmentModel } from '../../src/models/assignment.model';
import type { UserDocument } from '../../src/models/user.model';
import { createUser } from '../helpers/user-factory';

// Creates assignments straight through the model (not the API) so the schema
// itself is what gets exercised. The teacher is only a reference, so the
// shared user factory is enough to make it real.
let teacher: UserDocument;

beforeEach(async () => {
  teacher = await createUser({ email: 'teacher@example.com', role: 'teacher' });
});

const createAssignment = (overrides: Record<string, unknown> = {}) =>
  AssignmentModel.create({ title: 'Loop exercises', createdBy: teacher._id, ...overrides });

describe('Assignment model', () => {
  describe('valid data', () => {
    it('saves an assignment with sensible defaults', async () => {
      const assignment = await createAssignment();

      expect(assignment.title).toBe('Loop exercises');
      expect(assignment.description).toBe('');
      expect(assignment.instructions).toBe('');
      expect(assignment.status).toBe('draft');
      expect(assignment.maxScore).toBe(100);
      expect(assignment.dueDate).toBeUndefined();
      expect(assignment.createdAt).toBeInstanceOf(Date);
      expect(assignment.updatedAt).toBeInstanceOf(Date);
    });

    it('accepts explicit values for the optional fields', async () => {
      const dueDate = new Date('2026-12-01T23:59:00.000Z');
      const assignment = await createAssignment({
        description: 'Practice writing loops',
        instructions: 'Solve each exercise with a for or while loop.',
        dueDate,
        maxScore: 50,
        status: 'published'
      });

      expect(assignment.description).toBe('Practice writing loops');
      expect(assignment.instructions).toBe('Solve each exercise with a for or while loop.');
      expect(assignment.dueDate).toEqual(dueDate);
      expect(assignment.maxScore).toBe(50);
      expect(assignment.status).toBe('published');
    });

    it('trims the title before saving', async () => {
      const assignment = await createAssignment({ title: '  Arrays  ' });

      expect(assignment.title).toBe('Arrays');
    });
  });

  describe('invalid data', () => {
    it('rejects a missing title', async () => {
      await expect(createAssignment({ title: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a missing createdBy', async () => {
      await expect(createAssignment({ createdBy: undefined })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a negative maxScore', async () => {
      await expect(createAssignment({ maxScore: -1 })).rejects.toMatchObject({ name: 'ValidationError' });
    });

    it('rejects a status outside the allowed list', async () => {
      await expect(createAssignment({ status: 'archived' })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('references', () => {
    it('resolves createdBy to the creating user', async () => {
      const assignment = await createAssignment();
      const populated = await AssignmentModel.findById(assignment._id).populate('createdBy');

      expect(populated!.createdBy).toMatchObject({ email: 'teacher@example.com' });
    });
  });

  it('strips __v from JSON responses', async () => {
    const assignment = await createAssignment();
    const json = assignment.toJSON() as Record<string, unknown>;

    expect(json.title).toBe('Loop exercises');
    expect(json).not.toHaveProperty('__v');
  });
});
