import { ApiError, GoogleGenAI } from '@google/genai';
import { chatbotConfig } from '../config/chatbot';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export const isAiConfigured = Boolean(env.geminiApiKey);

if (!isAiConfigured) {
  console.warn('Warning: GEMINI_API_KEY is not set. The AI chat answers 503 until it is.');
}

const client = isAiConfigured ? new GoogleGenAI({ apiKey: env.geminiApiKey }) : undefined;

/** Turns Gemini failures into messages a student can act on. */
const toAppError = (error: unknown) => {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return new AppError(429, 'The free AI quota is used up for now. Wait a minute and try again.');
    }
    if (error.status === 400 || error.status === 401 || error.status === 403) {
      return new AppError(503, 'The AI is not set up correctly. Check GEMINI_API_KEY and GEMINI_MODEL in BE/.env.');
    }
  }
  console.error('Gemini request failed:', error);
  return new AppError(502, 'The AI did not answer. Please try again.');
};

/**
 * Sends the conversation (oldest first, last message from the user) to Gemini
 * and returns the reply text. The server keeps no history: the client sends it.
 */
export const generateChatReply = async (messages: ChatMessage[]): Promise<string> => {
  if (!client) {
    throw new AppError(503, 'The AI chat is not configured. Set GEMINI_API_KEY in BE/.env.');
  }

  const contents = messages
    .slice(-chatbotConfig.historyLimit)
    .map((message) => ({ role: message.role, parts: [{ text: message.text }] }));

  try {
    const response = await client.models.generateContent({
      model: env.geminiModel,
      contents,
      config: {
        systemInstruction: chatbotConfig.systemPrompt,
        thinkingConfig: { thinkingLevel: chatbotConfig.thinkingLevel }
      }
    });
    return response.text?.trim() || chatbotConfig.emptyReplyFallback;
  } catch (error) {
    throw toAppError(error);
  }
};
