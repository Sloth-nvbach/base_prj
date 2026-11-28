import type { ReactNode } from 'react';
import { Brand } from '@/shared/components/brand';
import { cn } from '@/shared/lib/utils';

interface AuthLayoutProps {
  children: ReactNode;
}

type LogLine = { text: string; tone?: 'pass' | 'fail' | 'dim' | 'prompt' };

// What the product does, shown as the output of one grading run.
const RUN_LOG: LogLine[] = [
  { text: '$ grade fibonacci.py --tests 4', tone: 'prompt' },
  { text: 'pass  fib(0) == 0', tone: 'pass' },
  { text: 'pass  fib(1) == 1', tone: 'pass' },
  { text: 'pass  fib(10) == 55', tone: 'pass' },
  { text: 'fail  hidden test #4', tone: 'fail' },
  { text: '' },
  { text: '3 of 4 tests passed in 0.21 s', tone: 'dim' },
  { text: 'AI review: 2 hints, no full solution', tone: 'dim' },
  { text: 'waiting for the teacher to confirm the score', tone: 'dim' },
];

const toneClass: Record<NonNullable<LogLine['tone']>, string> = {
  prompt: 'text-foreground',
  pass: 'text-success',
  fail: 'text-destructive',
  dim: 'text-muted-foreground',
};

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left: what a grading run looks like (lg and up). */}
      <aside className="hidden min-h-screen flex-col justify-between border-r bg-sidebar p-10 lg:flex lg:w-5/12 xl:p-14">
        <Brand className="text-base" />

        <div className="space-y-6">
          <p className="max-w-sm text-lg leading-relaxed">
            Grading and teaching assistant for programming courses. Tests run in a sandbox, AI suggests, the teacher decides.
          </p>
          <pre
            aria-label="Example grading run"
            className="overflow-x-auto rounded-lg border bg-background p-5 font-mono text-[0.8125rem] leading-7"
          >
            {RUN_LOG.map((line, index) => (
              <span
                key={index}
                className={cn('block animate-enter [animation-fill-mode:both]', line.tone && toneClass[line.tone])}
                style={{ animationDelay: `${200 + index * 110}ms` }}
              >
                {line.text || ' '}
              </span>
            ))}
          </pre>
        </div>

        <p className="text-sm text-muted-foreground">Scores are only published after a teacher confirms them.</p>
      </aside>

      {/* Right: the form. */}
      <main className="flex w-full flex-col items-center justify-center px-4 py-10 sm:px-8 lg:w-7/12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Brand className="text-base" />
            <p className="mt-2 text-sm text-muted-foreground">Grading and teaching assistant for programming courses.</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};
