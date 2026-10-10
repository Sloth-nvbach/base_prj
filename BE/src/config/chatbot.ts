import { ThinkingLevel } from '@google/genai';

/**
 * Personality and behaviour of the AI chat bot. Edit this file to turn the
 * sample assistant into the bot your project needs (a math tutor, a shop
 * assistant, a quiz master, ...). The frontend texts (bot name, welcome message,
 * suggested questions) live in FE/src/modules/chat/chat.config.ts.
 */
export const chatbotConfig = {
  /**
   * Instructions the model follows in every reply. Describe who the bot is,
   * what it should and should not do, and the style of its answers.
   */
  systemPrompt: [
    'You are a friendly assistant inside a student project.',
    'Answer in the same language as the user (Vietnamese or English).',
    'Keep answers short and clear: a few sentences or a short list.',
    'Write plain text without Markdown symbols such as **, # or ```.',
    'If you do not know something, say so instead of guessing.'
  ].join('\n'),

  /**
   * How much the model reasons before answering. LOW is quick and cheap on the
   * free quota; MEDIUM or HIGH give better answers to hard questions (math,
   * multi-step problems) but are slower. Options: MINIMAL, LOW, MEDIUM, HIGH.
   * Gemini 3.5 models ignore a custom temperature, so there is none here.
   */
  thinkingLevel: ThinkingLevel.LOW,

  /**
   * How many of the latest messages are sent to the model. More context means
   * better follow-up answers but uses more of the free quota.
   */
  historyLimit: 20,

  /** Reply used when the model returns no text (for example a blocked answer). */
  emptyReplyFallback: 'Sorry, I cannot answer that. Please try asking another way.'
};
