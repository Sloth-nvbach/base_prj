import * as React from 'react';
import { cn } from '@/shared/lib/utils';

/** A flat pane: 1px rule, no shadow. Elevation is reserved for overlays (dialog, menus, chat). */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('rounded-lg border bg-card text-card-foreground', className)} {...props} />;
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5 p-5 sm:p-6', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return <h3 className={cn('text-xl font-semibold', className)} {...props} />;
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex items-center p-5 pt-0 sm:p-6 sm:pt-0', className)} {...props} />;
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
