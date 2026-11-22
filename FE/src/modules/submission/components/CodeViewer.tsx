import { cn } from '@/shared/lib/utils';

interface CodeViewerProps {
  code: string;
  /** 1-based line numbers to highlight (e.g. lines flagged by the AI review). */
  highlight?: number[];
  label?: string;
}

/** Read-only code with line numbers (DSE-36/55). */
export const CodeViewer = ({ code, highlight = [], label = 'Submitted code' }: CodeViewerProps) => (
  <figure aria-label={label} className="overflow-auto rounded-md border bg-muted/40 font-mono text-sm">
    <table className="w-full border-collapse">
      <tbody>
        {code.split('\n').map((line, index) => (
          <tr key={index} className={cn(highlight.includes(index + 1) && 'bg-destructive/15')}>
            <td className="select-none border-r px-3 text-right align-top text-muted-foreground">{index + 1}</td>
            <td className="whitespace-pre px-3">{line || ' '}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </figure>
);
