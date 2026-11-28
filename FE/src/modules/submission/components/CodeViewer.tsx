import { cn } from '@/shared/lib/utils';

interface CodeViewerProps {
  code: string;
  /** 1-based line numbers to highlight (e.g. lines flagged by the AI review). */
  highlight?: number[];
  label?: string;
}

/** Read-only code with line numbers (DSE-36/55). Flagged lines get an amber gutter mark. */
export const CodeViewer = ({ code, highlight = [], label = 'Submitted code' }: CodeViewerProps) => {
  const lines = code.split('\n');
  return (
    <figure aria-label={label} className="overflow-hidden rounded-lg border bg-card">
      <figcaption className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-1.5 font-mono text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">
          {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          {highlight.length > 0 && `, ${highlight.length} flagged`}
        </span>
      </figcaption>
      <div className="max-h-[70vh] overflow-auto">
        <table className="w-full border-collapse font-mono text-[0.8125rem] leading-6">
          <tbody>
            {lines.map((line, index) => {
              const flagged = highlight.includes(index + 1);
              return (
                <tr key={index} className={cn(flagged && 'bg-warning/12')}>
                  <td
                    className={cn(
                      'sticky left-0 w-px select-none border-r border-l-2 border-l-transparent bg-card px-3 text-right align-top text-muted-foreground tabular-nums',
                      flagged && 'border-l-warning bg-[color-mix(in_srgb,var(--color-warning)_12%,var(--color-card))] text-warning'
                    )}
                  >
                    {index + 1}
                  </td>
                  <td className="whitespace-pre px-4">{line || ' '}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </figure>
  );
};
