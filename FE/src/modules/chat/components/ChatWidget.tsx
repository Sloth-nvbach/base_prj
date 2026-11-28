import { Bot, MessageCircle, SquarePen, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { chatConfig } from '../chat.config';
import { useChat } from '../hooks/use-chat';
import { ChatPanel } from './ChatPanel';

/**
 * Floating chat: a round button in the bottom-right corner that opens a small
 * chat popup above it. Closing the popup keeps the conversation. Shown on every
 * page of the app through `widgets` in chat.module.ts.
 */
export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const chat = useChat();

  // Escape closes the popup.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          role="dialog"
          aria-label={chatConfig.botName}
          className="flex h-[min(560px,calc(100dvh-6rem))] w-[min(400px,calc(100vw-2rem))] origin-bottom-right animate-enter flex-col overflow-hidden rounded-xl border bg-popover shadow-2xl"
        >
          <header className="flex items-center gap-2 border-b bg-sidebar py-1.5 pl-4 pr-2">
            <Bot className="size-4 text-primary" aria-hidden="true" />
            <p className="flex-1 font-mono text-sm font-semibold">{chatConfig.botName}</p>
            <Button variant="ghost" size="sm" aria-label="New chat" disabled={chat.messages.length === 0} onClick={chat.reset}>
              <SquarePen className="size-4" />
            </Button>
            <Button variant="ghost" size="sm" aria-label="Close chat" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </header>
          <ChatPanel chat={chat} />
        </section>
      )}

      <Button
        className="size-12 rounded-xl shadow-lg"
        aria-label={open ? 'Close chat' : 'Open chat'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="size-5" /> : <MessageCircle className="size-5" />}
      </Button>
    </div>
  );
};
