import { describe, expect, it } from 'vitest';
import { api } from '../helpers/api';
import { UserModel } from '../../src/models/user.model';
import { comparePassword } from '../../src/utils/hash';
import { emailOutbox, lastEmailTo } from '../helpers/email-outbox';
import { DEFAULT_PASSWORD, createUser, readSecrets } from '../helpers/user-factory';

const email = 'user@example.com';
const newPassword = 'BrandNewPass1';

describe('POST /api/auth/forgot-password', () => {
  it('issues a reset token and emails it', async () => {
    await createUser({ email });

    const response = await api().post('/api/auth/forgot-password').send({ email });

    expect(response.status).toBe(200);
    const { resetToken, resetTokenExpiresAt } = await readSecrets(email);
    expect(resetToken).toMatch(/^\d{6}$/);
    expect(resetTokenExpiresAt!.getTime()).toBeGreaterThan(Date.now());
    expect(lastEmailTo(email)?.html).toContain(resetToken as string);
  });

  it('answers 200 for an unknown email and sends nothing (no user enumeration)', async () => {
    const response = await api()
      .post('/api/auth/forgot-password')
      .send({ email: 'ghost@example.com' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Reset password token sent to your email');
    expect(emailOutbox).toHaveLength(0);
  });

  it('never returns the reset token in the response', async () => {
    await createUser({ email });
    const response = await api().post('/api/auth/forgot-password').send({ email });
    const { resetToken } = await readSecrets(email);
    expect(JSON.stringify(response.body)).not.toContain(resetToken as string);
  });
});

describe('POST /api/auth/reset-password', () => {
  const requestReset = async () => {
    await api().post('/api/auth/forgot-password').send({ email });
    const { resetToken } = await readSecrets(email);
    return resetToken as string;
  };

  it('replaces the password hash and clears the token', async () => {
    await createUser({ email });
    const token = await requestReset();

    const response = await api()
      .post('/api/auth/reset-password')
      .send({ email, token, newPassword });

    expect(response.status).toBe(200);
    const user = await UserModel.findOne({ email });
    expect(user?.resetToken).toBeUndefined();
    expect(user?.resetTokenExpiresAt).toBeUndefined();
    expect(user?.password).not.toBe(newPassword);
    await expect(comparePassword(newPassword, user!.password)).resolves.toBe(true);
    await expect(comparePassword(DEFAULT_PASSWORD, user!.password)).resolves.toBe(false);
  });

  it('lets the user log in with the new password afterwards', async () => {
    await createUser({ email });
    const token = await requestReset();
    await api().post('/api/auth/reset-password').send({ email, token, newPassword });

    const login = await api().post('/api/auth/login').send({ email, password: newPassword });

    expect(login.status).toBe(200);
    expect(login.body.token).toEqual(expect.any(String));
  });

  it('cannot reuse a reset token', async () => {
    await createUser({ email });
    const token = await requestReset();
    await api().post('/api/auth/reset-password').send({ email, token, newPassword });

    const replay = await api()
      .post('/api/auth/reset-password')
      .send({ email, token, newPassword: 'AnotherPass1' });

    expect(replay.status).toBe(400);
    expect(replay.body.message).toBe('Invalid or expired reset token');
  });

  it('rejects a wrong token', async () => {
    await createUser({ email });
    const token = await requestReset();
    const wrongToken = token === '000000' ? '111111' : '000000';

    const response = await api()
      .post('/api/auth/reset-password')
      .send({ email, token: wrongToken, newPassword });

    expect(response.status).toBe(400);
    await expect(
      comparePassword(DEFAULT_PASSWORD, (await UserModel.findOne({ email }))!.password)
    ).resolves.toBe(true);
  });

  it('rejects an expired token', async () => {
    await createUser({ email });
    const token = await requestReset();
    await UserModel.updateOne({ email }, { resetTokenExpiresAt: new Date(Date.now() - 1000) });

    const response = await api()
      .post('/api/auth/reset-password')
      .send({ email, token, newPassword });

    expect(response.status).toBe(400);
  });

  it('rejects a short new password with 400 from validation', async () => {
    await createUser({ email });
    const token = await requestReset();

    const response = await api()
      .post('/api/auth/reset-password')
      .send({ email, token, newPassword: '123' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});
