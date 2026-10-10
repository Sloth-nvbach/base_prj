import { Request, Response } from 'express';
import { generateChatReply } from '../services/ai.service';
import { ChatRequestInput } from '../validators/chat.validator';

export const sendChatMessage = async (req: Request, res: Response) => {
  const { messages } = req.body as ChatRequestInput;
  const reply = await generateChatReply(messages);
  res.json({ reply });
};
