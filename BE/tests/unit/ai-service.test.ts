import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AI_LIMITS, generateAiJson, generateAiText } from '../../src/services/ai.service';
import { geminiRecorder } from '../helpers/gemini-recorder';

const request = { systemPrompt: 'You review code.', messages: [{ role: 'user' as const, text: 'Review: x = 1' }] };
const reviewSchema = z.object({ score: z.number(), issues: z.array(z.string()) });

describe('ai service connection (DSE-27)', () => {
  it('returns the model text and asks for JSON when parsing a schema', async () => {
    geminiRecorder.replyText = '```json\n{"score": 7, "issues": ["unused variable"]}\n```';

    await expect(generateAiJson(request, reviewSchema)).resolves.toEqual({ score: 7, issues: ['unused variable'] });
    expect(geminiRecorder.requests[0]).toMatchObject({
      contents: [{ role: 'user', parts: [{ text: 'Review: x = 1' }] }],
      config: { systemInstruction: 'You review code.', responseMimeType: 'application/json' }
    });
  });

  it.each([['not json at all'], ['{"score": "high"}'], [undefined]])('answers 502 for malformed JSON %#', async (reply) => {
    geminiRecorder.replyText = reply;
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(generateAiJson(request, reviewSchema)).rejects.toMatchObject({ status: 502 });
  });

  it('rejects input over the size limit with 413 without calling the model', async () => {
    const tooLong = { ...request, messages: [{ role: 'user' as const, text: 'x'.repeat(AI_LIMITS.maxInputChars + 1) }] };

    await expect(generateAiText(tooLong)).rejects.toMatchObject({ status: 413 });
    expect(geminiRecorder.requests).toHaveLength(0);
  });

  it('answers 504 when the model does not answer in time', async () => {
    const original = AI_LIMITS.timeoutMs;
    AI_LIMITS.timeoutMs = 20;
    geminiRecorder.hang = true;
    try {
      await expect(generateAiText(request)).rejects.toMatchObject({ status: 504 });
    } finally {
      AI_LIMITS.timeoutMs = original;
    }
  });
});

describe('ai service without an API key', () => {
  afterEach(() => {
    vi.doUnmock('../../src/config/env');
    vi.resetModules();
  });

  it('answers 503 with what to configure, without calling Gemini', async () => {
    vi.resetModules();
    const actual = await vi.importActual<typeof import('../../src/config/env')>('../../src/config/env');
    vi.doMock('../../src/config/env', () => ({ env: { ...actual.env, geminiApiKey: undefined } }));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { generateChatReply, isAiConfigured } = await import('../../src/services/ai.service');

    expect(isAiConfigured).toBe(false);
    await expect(generateChatReply([{ role: 'user', text: 'Hi' }])).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('GEMINI_API_KEY')
    });
  });
});
