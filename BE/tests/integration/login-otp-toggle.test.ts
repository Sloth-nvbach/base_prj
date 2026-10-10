import { describe, expect, it } from 'vitest';
import { UserModel } from '../../src/models/user.model';
import { verifyToken } from '../../src/utils/jwt';
import { api } from '../helpers/api';
import { emailOutbox, lastEmailTo } from '../helpers/email-outbox';
import { DEFAULT_PASSWORD, bearerFor, createUser } from '../helpers/user-factory';

const email = 'user@example.com';
const credentials = { email, password: DEFAULT_PASSWORD };

describe('login without the OTP step (default)', () => {
  it('returns a token straight away and sends no email', async () => {
    const user = await createUser({ email });

    const response = await api().post('/api/auth/login').send(credentials);

    expect(response.status).toBe(200);
    expect(verifyToken(response.body.token).sub).toBe(String(user._id));
    expect(emailOutbox).toHaveLength(0);
  });

  it('still rejects a wrong password and an unverified email', async () => {
    await createUser({ email });
    expect((await api().post('/api/auth/login').send({ email, password: 'wrong-pass' })).status).toBe(401);

    await createUser({ email: 'new@example.com', isEmailVerified: false });
    const unverified = await api().post('/api/auth/login').send({ ...credentials, email: 'new@example.com' });
    expect(unverified.status).toBe(403);
  });

  it('treats accounts created before the setting existed as opted out', async () => {
    const user = await createUser({ email });
    await UserModel.collection.updateOne({ _id: user._id }, { $unset: { loginOtpEnabled: '' } });

    const response = await api().post('/api/auth/login').send(credentials);

    expect(response.status).toBe(200);
  });
});

describe('PATCH /api/profile/security', () => {
  it('turns the login OTP step on, then login asks for the emailed code', async () => {
    const user = await createUser({ email });

    const toggle = await api()
      .patch('/api/profile/security')
      .set('Authorization', bearerFor(user))
      .send({ loginOtpEnabled: true });

    expect(toggle.status).toBe(200);
    expect(toggle.body.loginOtpEnabled).toBe(true);

    const login = await api().post('/api/auth/login').send(credentials);
    expect(login.status).toBe(202);
    expect(login.body).toMatchObject({ requiresOtp: true, email });
    expect(lastEmailTo(email)).toBeDefined();
  });

  it('turns it back off', async () => {
    const user = await createUser({ email, loginOtpEnabled: true });

    await api().patch('/api/profile/security').set('Authorization', bearerFor(user)).send({ loginOtpEnabled: false });

    expect((await api().post('/api/auth/login').send(credentials)).status).toBe(200);
  });

  it('requires a boolean and authentication', async () => {
    const user = await createUser({ email });

    const invalid = await api()
      .patch('/api/profile/security')
      .set('Authorization', bearerFor(user))
      .send({ loginOtpEnabled: 'yes' });
    expect(invalid.status).toBe(400);

    const anonymous = await api().patch('/api/profile/security').send({ loginOtpEnabled: true });
    expect(anonymous.status).toBe(401);
  });
});
