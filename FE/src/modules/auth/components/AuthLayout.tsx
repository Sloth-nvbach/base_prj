import { ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

export const AuthLayout = ({ children }: AuthLayoutProps) => {
  return (
    <div className="min-h-screen flex bg-background">
      {/* Branding Panel - Left side (30% on lg+, hidden on mobile) */}
      <aside className="hidden lg:flex lg:w-3/10 flex-col items-center justify-center p-10 bg-sidebar border-r border-sidebar-border min-h-screen">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <ShieldCheck className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-3 text-sidebar-foreground">
            Smart EdTech
          </h1>
          <p className="text-base text-sidebar-foreground/70 mb-8">
            AI-powered grading & teaching assistant platform for programming courses.
          </p>
          <ul className="space-y-3 text-left text-sidebar-foreground/80">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span className="text-sm">Create assignments with ease</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span className="text-sm">Auto-grading with test cases</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span className="text-sm">Flexible rubric builder</span>
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-primary" />
              <span className="text-sm">AI-assisted feedback</span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Form Panel - Right side (70% on lg+, full width on mobile) */}
      <main className="flex w-full lg:w-7/10 items-center justify-center p-8">
        <div className="w-full max-w-lg">
          <div className="lg:hidden text-center mb-6">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ShieldCheck className="size-6" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Smart EdTech</h1>
            <p className="text-muted-foreground mt-1 text-sm">AI-powered grading platform</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};