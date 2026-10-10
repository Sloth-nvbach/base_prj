/** `model` is Gemini's name for the assistant side of the conversation. */
export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  text: string;
}

export interface ChatReply {
  reply: string;
}
