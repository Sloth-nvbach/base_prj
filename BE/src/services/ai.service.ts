import { ApiError, GoogleGenAI, type ThinkingLevel } from '@google/genai';
import type { ZodType } from 'zod';
import { chatbotConfig } from '../config/chatbot';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

/** One request to the AI model, independent of the provider (DSE-27). */
export interface AiRequest {
  systemPrompt: string;
  /** Oldest first; the last message comes from the user. */
  messages: ChatMessage[];
  thinkingLevel?: ThinkingLevel;
  /** Ask the model for a JSON answer. */
  json?: boolean;
}

/** What a model provider must do. Add another one (DeepSeek, ...) and switch `provider` below. */
export interface AiProvider {
  name: string;
  isConfigured: boolean;
  generate(request: AiRequest, signal: AbortSignal): Promise<string>;
}

/** Limits for every AI call. */
export const AI_LIMITS = {
  timeoutMs: 30_000,
  /** Characters across the system prompt and all messages. */
  maxInputChars: 40_000
};

const geminiClient = env.geminiApiKey ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : undefined;

const geminiProvider: AiProvider = {
  name: 'Gemini',
  isConfigured: Boolean(geminiClient),
  async generate(request, signal) {
    const response = await geminiClient!.models.generateContent({
      model: env.geminiModel,
      contents: request.messages.map((message) => ({ role: message.role, parts: [{ text: message.text }] })),
      config: {
        systemInstruction: request.systemPrompt,
        thinkingConfig: { thinkingLevel: request.thinkingLevel ?? chatbotConfig.thinkingLevel },
        ...(request.json ? { responseMimeType: 'application/json' } : {}),
        abortSignal: signal
      }
    });
    return response.text?.trim() ?? '';
  }
};

const provider: AiProvider = geminiProvider;

export const isAiConfigured = provider.isConfigured;

if (!isAiConfigured) {
  console.warn('Warning: GEMINI_API_KEY is not set. AI features answer 503 until it is.');
}

/** Turns provider failures into messages a student can act on. */
const toAppError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new AppError(429, 'The free AI quota is used up for now. Wait a minute and try again.');
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return new AppError(503, 'The AI is not set up correctly. Check GEMINI_API_KEY and GEMINI_MODEL in BE/.env.');
    }
  }
  console.error(`${provider.name} request failed:`, error);
  return new AppError(502, 'The AI did not answer. Please try again.');
};

/**
 * Sends one request to the configured model and returns its text (may be empty).
 * Checks configuration and input size, stops after `AI_LIMITS.timeoutMs`.
 */
export const generateAiText = async (request: AiRequest): Promise<string> => {
  if (!provider.isConfigured) {
    throw new AppError(503, 'The AI is not configured. Set GEMINI_API_KEY in BE/.env.');
  }
  const inputChars = request.systemPrompt.length + request.messages.reduce((sum, m) => sum + m.text.length, 0);
  if (inputChars > AI_LIMITS.maxInputChars) {
    throw new AppError(413, `The input is too long for the AI (max ${AI_LIMITS.maxInputChars} characters).`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_LIMITS.timeoutMs);
  try {
    return await provider.generate(request, controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new AppError(504, 'The AI took too long to answer. Please try again.');
    }
    throw toAppError(error);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Like `generateAiText`, but asks for JSON and checks it against `schema`.
 * A missing, broken or wrongly shaped answer becomes a 502, never a crash.
 */
export const generateAiJson = async <T>(request: Omit<AiRequest, 'json'>, schema: ZodType<T>): Promise<T> => {
  const text = await generateAiText({ ...request, json: true });
  // Models sometimes wrap JSON in a ```json fence despite the JSON mime type.
  const raw = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = undefined;
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    console.error('AI returned malformed JSON:', text.slice(0, 500));
    throw new AppError(502, 'The AI answered in an unexpected format. Please try again.');
  }
  return result.data;
};

/**
 * Sends the conversation (oldest first, last message from the user) to the model
 * and returns the reply text. The server keeps no history: the client sends it.
 */
export const generateChatReply = async (messages: ChatMessage[]): Promise<string> => {
  const reply = await generateAiText({
    systemPrompt: chatbotConfig.systemPrompt,
    messages: messages.slice(-chatbotConfig.historyLimit)
  });
  return reply || chatbotConfig.emptyReplyFallback;
};
