import { Bot, User } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import type { ChatMessage } from '../types/chat.types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

export const ChatMessageBubble = ({ message }: ChatMessageBubbleProps) => {
  const fromUser = message.role === 'user';
  const Icon = fromUser ? User : Bot;

  return (
    <div className={cn('flex items-start gap-2', fromUser && 'flex-row-reverse')}>
      <div className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground" aria-hidden="true">
        <Icon className="size-3.5" />
      </div>
      <div
        className={cn(
          'max-w-[85%] animate-enter whitespace-pre-wrap break-words rounded-lg px-3.5 py-2 text-sm leading-relaxed',
          fromUser ? 'bg-accent text-accent-foreground' : 'border bg-card text-foreground',
        )}
      >
        {message.text}
      </div>
    </div>
  );
};
