import { describe, expect, it } from 'vitest';
import { formatDevEmail, isSmtpConfigured } from '../../src/services/email.service';

describe('dev email output', () => {
  it('runs without SMTP in tests, so mail goes to the console transport', () => {
    expect(isSmtpConfigured).toBe(false);
  });

  it('prints recipient, subject and the readable text of the HTML body', () => {
    const output = formatDevEmail(
      'student@example.com',
      'Verify your email - OTP code',
      '<div><p>Use this OTP</p>\n  <span style="x">123456</span></div>'
    );

    expect(output).toContain('To:      student@example.com');
    expect(output).toContain('Subject: Verify your email - OTP code');
    expect(output).toContain('Use this OTP 123456');
    expect(output).not.toContain('<span');
  });
});
