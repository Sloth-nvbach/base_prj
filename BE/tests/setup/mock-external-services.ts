import { beforeEach, vi } from 'vitest';

/**
 * Replaces every outbound third-party dependency (SMTP, Cloudinary, Gemini) with an
 * in-memory recorder. Real application code still runs end to end; only the
 * network boundary is faked.
 */

vi.mock('nodemailer', async () => {
  const { emailOutbox } = await import('../helpers/email-outbox');

  const createTransport = () => ({
    sendMail: async (options: Record<string, unknown>) => {
      emailOutbox.push(options as never);
      return { messageId: 'test-message-id' };
    }
  });

  return { default: { createTransport }, createTransport };
});

vi.mock('cloudinary', async () => {
  const { cloudinaryRecorder } = await import('../helpers/cloudinary-recorder');

  const v2 = {
    config: () => undefined,
    uploader: {
      upload_stream: (
        options: { folder: string },
        callback: (error: unknown, result?: unknown) => void
      ) => ({
        end: (buffer: Buffer) => {
          cloudinaryRecorder.uploads.push({
            folder: options.folder,
            byteLength: buffer.byteLength
          });
          callback(null, cloudinaryRecorder.uploadResult);
        }
      }),
      destroy: async (publicId: string) => {
        cloudinaryRecorder.destroyed.push(publicId);
        if (cloudinaryRecorder.destroyError) throw cloudinaryRecorder.destroyError;
        return { result: 'ok' };
      }
    }
  };

  return { v2, default: { v2 } };
});

vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  const { geminiRecorder } = await import('../helpers/gemini-recorder');

  class GoogleGenAI {
    models = {
      generateContent: async (params: Record<string, unknown>) => {
        geminiRecorder.requests.push(params);
        if (geminiRecorder.error) throw geminiRecorder.error;
        return { text: geminiRecorder.replyText };
      }
    };
  }

  // Keep the real ApiError so `instanceof` checks in the service still work.
  return { ...actual, GoogleGenAI };
});

beforeEach(async () => {
  const { clearEmailOutbox } = await import('../helpers/email-outbox');
  const { cloudinaryRecorder } = await import('../helpers/cloudinary-recorder');
  const { geminiRecorder } = await import('../helpers/gemini-recorder');
  clearEmailOutbox();
  cloudinaryRecorder.reset();
  geminiRecorder.reset();
});
