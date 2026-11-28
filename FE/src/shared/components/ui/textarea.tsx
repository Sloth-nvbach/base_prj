import * as React from 'react';
import { cn } from '@/shared/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full rounded-md border border-input bg-card px-3 py-2 text-sm leading-relaxed transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
