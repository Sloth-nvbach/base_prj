import { SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Textarea } from '@/shared/components/ui/textarea';
import { chatConfig } from '../chat.config';

interface ChatComposerProps {
  disabled?: boolean;
  onSend: (text: string) => void;
}

/** Message box: Enter sends, Shift+Enter adds a new line. */
export const ChatComposer = ({ disabled, onSend }: ChatComposerProps) => {
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim() || disabled) return;
    onSend(text);
    setText('');
  };

  return (
    <form
      className="flex items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Textarea
        aria-label="Message"
        rows={2}
        maxLength={4000}
        className="min-h-0 resize-none"
        placeholder={chatConfig.inputPlaceholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <Button type="submit" aria-label="Send" disabled={disabled || !text.trim()}>
        <SendHorizontal className="size-4" />
      </Button>
    </form>
  );
};
