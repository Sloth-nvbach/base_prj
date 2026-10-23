import { useState } from 'react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/page-header';
import { ApiResultCard } from '../components/ApiResultCard';
import { AssignmentDemoSection } from '../components/AssignmentDemoSection';
import { SubmissionDemoSection } from '../components/SubmissionDemoSection';
import type { DemoResult } from '../types/demo.types';

const DEMO_ACCOUNTS = [
  { email: 'teacher@example.com', password: 'teacher1234', role: 'teacher' },
  { email: 'demo@example.com', password: 'demo1234', role: 'student' },
  { email: 'admin@example.com', password: 'admin1234', role: 'admin' }
];

/**
 * Sprint-demo console: exercises every backend endpoint built in this sprint
 * (assignment CRUD, submission access rules, submitting, history) and shows the
 * raw HTTP answer of the last action. The buttons are shown to every role on
 * purpose — refusing a wrong role with 403/404 is part of the demo. This module
 * is a testing tool, not the final student/teacher UI.
 */
export const SprintDemoPage = () => {
  const [result, setResult] = useState<DemoResult | null>(null);
  const { data: user } = useCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprint Demo"
        description="Quick-test the backend features of this sprint: assignments (DSE-14/16), submitting and access rules (DSE-17/19), submission history (DSE-18)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Signed in as <span className="font-medium">{user?.email ?? '…'}</span>{' '}
            <Badge variant="secondary">{user?.role ?? '…'}</Badge>
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Log in as the teacher, create an assignment, then press Publish.</li>
            <li>Log in as the student, press “Can I submit?”, then submit code (twice — the history keeps everything).</li>
            <li>Press a teacher button while signed in as a student to see the 403/404 the backend answers.</li>
          </ol>
          <div className="flex flex-wrap gap-2 pt-1">
            {DEMO_ACCOUNTS.map((account) => (
              <Badge key={account.email} variant="outline">
                {account.email} / {account.password} ({account.role})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <ApiResultCard result={result} />

      <AssignmentDemoSection onResult={setResult} />
      <SubmissionDemoSection onResult={setResult} />
    </div>
  );
};
