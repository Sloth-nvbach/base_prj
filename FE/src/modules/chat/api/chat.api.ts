import { http } from '@/shared/api/http';
import type { ChatMessage, ChatReply } from '../types/chat.types';

export const chatApi = {
  /** Sends the whole conversation (last message from the user) and resolves with the reply. */
  send: (messages: ChatMessage[]) => http.post<ChatReply>('/chat', { messages }).then((r) => r.data),
};
