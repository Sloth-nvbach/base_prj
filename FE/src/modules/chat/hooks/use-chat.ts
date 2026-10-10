import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { chatApi } from '../api/chat.api';
import type { ChatMessage } from '../types/chat.types';

/**
 * Conversation state for the chat page. The backend keeps no history: every
 * request sends the messages so far, and the reply is appended when it arrives.
 */
export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const request = useMutation({
    mutationFn: chatApi.send,
    onSuccess: ({ reply }) => setMessages((current) => [...current, { role: 'model', text: reply }]),
    // Shown inline with a retry button instead of the default toast.
    onError: () => undefined,
  });

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || request.isPending) return;
    const next: ChatMessage[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(next);
    request.mutate(next);
  };

  /** Sends the same conversation again after a failed request. */
  const retry = () => {
    if (messages.at(-1)?.role === 'user') request.mutate(messages);
  };

  const reset = () => {
    setMessages([]);
    request.reset();
  };

  return {
    messages,
    send,
    retry,
    reset,
    isThinking: request.isPending,
    error: request.isError ? request.error : undefined,
  };
};
