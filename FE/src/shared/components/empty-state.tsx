import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Usually a button that creates the first item. */
  action?: ReactNode;
}

/** Shown when a list has no items. */
export const EmptyState = ({ title, description, icon: Icon = Inbox, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-input px-6 py-12 text-center">
    <Icon className="size-7 text-muted-foreground" strokeWidth={1.5} aria-hidden="true" />
    <div className="space-y-1">
      <p className="font-mono font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
    {action}
  </div>
);
