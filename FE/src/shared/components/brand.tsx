import { cn } from '@/shared/lib/utils';

interface BrandProps {
  /** Text after the name, e.g. "admin". */
  suffix?: string;
  className?: string;
}

/**
 * Product mark: the name in mono followed by an amber block caret. The caret
 * blinks three times when the shell mounts, then stays solid (no endless motion).
 */
export const Brand = ({ suffix, className }: BrandProps) => (
  <span className={cn('inline-flex items-baseline font-mono text-sm font-semibold tracking-tight', className)}>
    smart-edtech
    {suffix && <span className="text-muted-foreground">/{suffix}</span>}
    <span aria-hidden="true" className="ml-0.5 inline-block h-[1.05em] w-[0.55em] translate-y-[0.15em] animate-caret bg-primary" />
  </span>
);
