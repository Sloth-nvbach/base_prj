import { z } from 'zod';

export const chatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  text: z.string().trim().min(1, 'Message is empty').max(4000, 'Message is too long (max 4000 characters)')
});

export const chatRequestSchema = z.object({
  messages: z
    .array(chatMessageSchema)
    .min(1, 'Send at least one message')
    .max(50, 'Too many messages; start a new chat')
    .refine((messages) => messages[messages.length - 1]?.role === 'user', 'The last message must come from the user')
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
