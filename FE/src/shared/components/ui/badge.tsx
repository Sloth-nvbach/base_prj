import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/lib/utils';

// Status chips: tinted fill + strong text, so the colour is never the only signal (the word is).
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-1.5 py-px font-mono text-xs font-medium whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-primary/40 bg-primary/12 text-primary',
        secondary: 'border-border bg-muted text-muted-foreground',
        success: 'border-success/40 bg-success/12 text-success',
        warning: 'border-warning/40 bg-warning/12 text-warning',
        destructive: 'border-destructive/40 bg-destructive/12 text-destructive',
        outline: 'border-input text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
