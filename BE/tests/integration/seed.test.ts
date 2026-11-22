import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/models/user.model';
import { DEMO_ACCOUNTS, DEMO_STUDENTS, seedDemoAccounts } from '../../src/scripts/seed';
import { comparePassword } from '../../src/utils/hash';

describe('seedDemoAccounts', () => {
  it('creates verified demo accounts with the documented passwords', async () => {
    const created = await seedDemoAccounts();
    expect(created).toEqual([...DEMO_ACCOUNTS, ...DEMO_STUDENTS].map((account) => account.email));

    for (const account of DEMO_ACCOUNTS) {
      const user = await UserModel.findOne({ email: account.email });
      expect(user?.isEmailVerified).toBe(true);
      expect(await comparePassword(account.password, user!.password)).toBe(true);
    }
  });

  it('adds sample students, some unverified, all with the documented password', async () => {
    await seedDemoAccounts();
    const students = await UserModel.find({ email: /^student/ });
    expect(students).toHaveLength(DEMO_STUDENTS.length);
    expect(students.some((student) => !student.isEmailVerified)).toBe(true);
    expect(await comparePassword('student1234', students[0].password)).toBe(true);
  });

  it('is idempotent', async () => {
    await seedDemoAccounts();
    expect(await seedDemoAccounts()).toEqual([]);
    expect(await UserModel.countDocuments()).toBe(DEMO_ACCOUNTS.length + DEMO_STUDENTS.length);
  });

  it('repairs demo accounts left with a pre-role-change role, keeps valid roles', async () => {
    await seedDemoAccounts();
    await UserModel.collection.updateOne({ email: 'student01@example.com' }, { $set: { role: 'user' } });
    await UserModel.collection.updateOne({ email: 'student02@example.com' }, { $set: { role: 'teacher' } });

    await seedDemoAccounts();
    expect((await UserModel.findOne({ email: 'student01@example.com' }))!.role).toBe('student');
    expect((await UserModel.findOne({ email: 'student02@example.com' }))!.role).toBe('teacher');
  });
});
