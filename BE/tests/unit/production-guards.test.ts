import { afterEach, describe, expect, it, vi } from 'vitest';

/** Loads a module with `config/env` replaced, so production-only branches can run. */
const withEnv = async <T>(overrides: Record<string, unknown>, path: string): Promise<T> => {
  vi.resetModules();
  const actual = await vi.importActual<typeof import('../../src/config/env')>('../../src/config/env');
  vi.doMock('../../src/config/env', () => ({ env: { ...actual.env, ...overrides } }));
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  return import(path) as Promise<T>;
};

afterEach(() => {
  vi.doUnmock('../../src/config/env');
  vi.resetModules();
});

describe('production without SMTP', () => {
  it('refuses to send (503) instead of printing codes to the logs', async () => {
    const { sendEmail } = await withEnv<typeof import('../../src/services/email.service')>(
      { nodeEnv: 'production', smtpHost: undefined },
      '../../src/services/email.service'
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(sendEmail('a@b.com', 'OTP', '<b>123456</b>')).rejects.toMatchObject({ status: 503 });
    expect(log).not.toHaveBeenCalled();
  });

  it('prints the email in development', async () => {
    const { sendEmail } = await withEnv<typeof import('../../src/services/email.service')>(
      { nodeEnv: 'development', smtpHost: undefined },
      '../../src/services/email.service'
    );
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    await sendEmail('a@b.com', 'OTP', '<b>123456</b>');
    expect(log.mock.calls[0][0]).toContain('123456');
  });
});

describe('trust proxy', () => {
  it('is off by default and follows TRUST_PROXY', async () => {
    const { parseEnv } = await vi.importActual<typeof import('../../src/config/env')>('../../src/config/env');
    const base = { MONGO_URI: 'mongodb://localhost/test', JWT_SECRET: 'dev-secret' };
    expect(parseEnv(base).trustProxy).toBe(0);
    expect(parseEnv({ ...base, TRUST_PROXY: '1' }).trustProxy).toBe(1);

    const { app } = await withEnv<typeof import('../../src/app')>({ trustProxy: 1 }, '../../src/app');
    expect(app.get('trust proxy')).toBe(1);
  });
});
