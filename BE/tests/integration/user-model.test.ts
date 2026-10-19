import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/models/user.model';
import { comparePassword, hashPassword } from '../../src/utils/hash';

// Creates users straight through the model (not the test factory) so the
// schema itself is what gets exercised.
const createUser = async (overrides: Record<string, unknown> = {}) =>
  UserModel.create({
    email: 'student@example.com',
    password: await hashPassword('Passw0rd!'),
    ...overrides
  });

describe('User model', () => {
  describe('email', () => {
    it('normalizes whitespace and case before saving', async () => {
      const user = await createUser({ email: '  Student@Example.COM ' });

      expect(user.email).toBe('student@example.com');
    });

    it('rejects a duplicate email, whatever the case', async () => {
      await createUser({ email: 'student@example.com' });

      await expect(createUser({ email: 'student@example.com' })).rejects.toMatchObject({ code: 11000 });
      await expect(createUser({ email: 'STUDENT@example.com' })).rejects.toMatchObject({ code: 11000 });
    });
  });

  describe('role', () => {
    it('defaults to student (regular account)', async () => {
      const user = await createUser();

      expect(user.role).toBe('student');
    });

    it('accepts the teacher and admin roles', async () => {
      const teacher = await createUser({ email: 'teacher@example.com', role: 'teacher' });
      const admin = await createUser({ email: 'admin@example.com', role: 'admin' });

      expect(teacher.role).toBe('teacher');
      expect(admin.role).toBe('admin');
    });

    it('rejects a role outside the allowed list', async () => {
      await expect(createUser({ role: 'superadmin' })).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  it('adds createdAt and updatedAt timestamps', async () => {
    const user = await createUser();

    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('never stores the plain-text password', async () => {
    const user = await createUser();

    expect(user.password).not.toBe('Passw0rd!');
    expect(user.password).toMatch(/^\$2[ab]\$/);
    await expect(comparePassword('Passw0rd!', user.password)).resolves.toBe(true);
  });

  it('strips private fields from JSON responses', async () => {
    const soon = new Date();
    const user = await createUser({
      otpCode: '123456',
      otpExpiresAt: soon,
      resetToken: 'reset-token',
      resetTokenExpiresAt: soon
    });

    const json = user.toJSON() as Record<string, unknown>;

    expect(json.email).toBe('student@example.com');
    expect(json.role).toBe('student');
    for (const field of ['password', 'otpCode', 'otpExpiresAt', 'resetToken', 'resetTokenExpiresAt', '__v']) {
      expect(json).not.toHaveProperty(field);
    }
  });
});
