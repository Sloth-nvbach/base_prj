import * as React from 'react';
import { cn } from '@/shared/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'h-10 py-2 flex w-full rounded-md border border-input bg-card px-3 text-sm transition-colors placeholder:text-muted-foreground hover:border-muted-foreground focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
