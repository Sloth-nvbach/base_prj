import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value?: number | string;
  icon: LucideIcon;
  /** Small text under the value, e.g. "3 new this week". */
  hint?: string;
  isLoading?: boolean;
}

/** One number on a dashboard. Sits in a grid with a shared border, like segments of a status line. */
export const StatCard = ({ label, value, icon: Icon, hint, isLoading }: StatCardProps) => (
  <div className="flex flex-col gap-1 rounded-lg border bg-card px-4 py-3.5">
    <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </p>
    {isLoading ? <Skeleton className="h-8 w-14" /> : <p className="font-mono text-[1.75rem] font-semibold leading-tight tabular-nums">{value ?? '—'}</p>}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
);
