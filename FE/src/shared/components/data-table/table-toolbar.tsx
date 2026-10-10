import type { ReactNode } from 'react';

interface TableToolbarProps {
  /** Search box and filters, on the left. */
  children: ReactNode;
  /** Buttons on the right, e.g. bulk actions. */
  actions?: ReactNode;
}

/** Row above a table: search and filters on the left, actions on the right. Wraps on small screens. */
export const TableToolbar = ({ children, actions }: TableToolbarProps) => (
  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">{children}</div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
