import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  /** Buttons shown on the right, e.g. a "New" button. */
  actions?: ReactNode;
}

/** Title row at the top of every page: mono title with the amber caret, blinking briefly on arrival. */
export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      <h1 className="text-2xl font-semibold break-words sm:text-[1.75rem]">
        {title}
        <span aria-hidden="true" className="ml-1.5 inline-block h-[0.9em] w-[0.5em] translate-y-[0.1em] animate-caret bg-primary" />
      </h1>
      {description && <p className="mt-1.5 max-w-prose text-sm text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </div>
);
