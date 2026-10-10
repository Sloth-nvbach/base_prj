import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

/**
 * Without SMTP settings the app still works in development: mail is rendered by
 * nodemailer's JSON transport (nothing leaves the machine) and printed to the
 * console, so OTP codes can be read from the backend terminal. In production
 * sending answers 503 instead, so codes never end up in logs.
 */
export const isSmtpConfigured = Boolean(env.smtpHost);

const transporter = isSmtpConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: { user: env.smtpUser, pass: env.smtpPass }
    })
  : nodemailer.createTransport({ jsonTransport: true });

if (!isSmtpConfigured && env.nodeEnv === 'production') {
  console.warn('Warning: SMTP_HOST is not set. Sending email answers 503 until it is.');
}

const htmlToText = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Prints an email in a block that is easy to spot in the dev server output. */
export const formatDevEmail = (to: string, subject: string, html: string) =>
  [
    '',
    '================ DEV EMAIL (SMTP not configured) ================',
    `To:      ${to}`,
    `Subject: ${subject}`,
    '',
    htmlToText(html),
    '=================================================================',
    ''
  ].join('\n');

export const sendEmail = async (to: string, subject: string, html: string) => {
  // Never print codes into production logs.
  if (!isSmtpConfigured && env.nodeEnv === 'production') {
    throw new AppError(503, 'Email is not configured. Set the SMTP_* variables.');
  }
  await transporter.sendMail({ from: env.emailFrom, to, subject, html });
  if (!isSmtpConfigured && env.nodeEnv !== 'test') {
    console.log(formatDevEmail(to, subject, html));
  }
};

export const sendOtpEmail = async (to: string, otp: string) => {
  const expiresInMinutes = env.otpExpiresMinutes;
  await sendEmail(
    to,
    'Verify your email - OTP code',
    `
      <div style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,sans-serif;">
        <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
          <div style="background:#ffffff;border:1px solid #e4e4e7;border-radius:14px;padding:24px;">
            <p style="margin:0 0 8px;font-size:12px;color:#71717a;letter-spacing:0.08em;text-transform:uppercase;">
              MERN Auth Starter
            </p>
            <h2 style="margin:0 0 10px;font-size:22px;color:#18181b;">Email Verification OTP</h2>
            <p style="margin:0 0 16px;font-size:14px;color:#3f3f46;line-height:1.6;">
              Use this OTP to verify your account. This code is valid for ${expiresInMinutes} minutes.
            </p>
            <div style="margin:0 0 18px;padding:14px;border-radius:12px;background:#faf5ff;border:1px dashed #a855f7;text-align:center;">
              <span style="font-size:30px;font-weight:700;letter-spacing:0.35em;color:#6d28d9;">${otp}</span>
            </div>
            <p style="margin:0 0 8px;font-size:13px;color:#52525b;">If you did not request this OTP, please ignore this email.</p>
            <p style="margin:0;font-size:12px;color:#a1a1aa;">For security, never share this OTP with anyone.</p>
          </div>
        </div>
      </div>
    `
  );
};

export const sendResetTokenEmail = async (to: string, token: string) => {
  await sendEmail(
    to,
    'Password reset token',
    `<p>Your reset token is <b>${token}</b>. It expires in ${env.resetTokenExpiresMinutes} minutes.</p>`
  );
};
