import { useState } from 'react';
import { useCurrentUser } from '@/modules/auth/hooks/use-current-user';
import { Badge } from '@/shared/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { PageHeader } from '@/shared/components/page-header';
import { Separator } from '@/shared/components/ui/separator';
import { ApiResultCard } from '../components/ApiResultCard';
import { AssignmentDemoSection } from '../components/AssignmentDemoSection';
import { SubmissionDemoSection } from '../components/SubmissionDemoSection';
import { CourseDemoSection } from '../components/CourseDemoSection';
import { ClassDemoSection } from '../components/ClassDemoSection';
import { EnrollmentDemoSection } from '../components/EnrollmentDemoSection';
import { RubricDemoSection } from '../components/RubricDemoSection';
import type { DemoResult } from '../types/demo.types';

const DEMO_ACCOUNTS = [
  { email: 'teacher@example.com', password: 'teacher1234', role: 'teacher' },
  { email: 'demo@example.com', password: 'demo1234', role: 'student' },
  { email: 'admin@example.com', password: 'admin1234', role: 'admin' }
];

/**
 * Sprint-demo console: exercises every backend endpoint built in this sprint
 * (Course/Class/Enrollment DSE-49/50/56, Rubric DSE-51, Assignment CRUD DSE-14/16,
 * submission access rules DSE-17/19, submission history DSE-18, TestCase DSE-20/21)
 * and shows the raw HTTP answer of the last action. The buttons are shown to
 * every role on purpose — refusing a wrong role with 403/404 is part of the demo.
 * This module is a testing tool, not the final student/teacher UI.
 */
export const SprintDemoPage = () => {
  const [result, setResult] = useState<DemoResult | null>(null);
  const { data: user } = useCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sprint Demo"
        description="Quick-test the backend features of this sprint: Courses (DSE-49), Classes & Enrollments (DSE-50/56), Rubrics (DSE-51), Assignments (DSE-14/16), Submissions (DSE-17/19), TestCases (DSE-20/21)."
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
            <li><strong>Courses/Classes/Enrollments:</strong> Log in as teacher/admin, create a course, then a class, enroll as student.</li>
            <li><strong>Rubrics:</strong> Log in as teacher, pick an assignment, create criteria with weights (auto-normalizes to 100%).</li>
            <li><strong>Assignments:</strong> Log in as teacher, create assignment, publish it. Log in as student, press "Can I submit?", then submit code (twice — history keeps everything).</li>
            <li>Press a teacher/admin button while signed in as a student to see the 403/404 the backend answers.</li>
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

      <Separator />
      <CourseDemoSection onResult={setResult} />
      <Separator />
      <ClassDemoSection onResult={setResult} />
      <Separator />
      <EnrollmentDemoSection onResult={setResult} />
      <Separator />
      <RubricDemoSection onResult={setResult} />
      <Separator />
      <AssignmentDemoSection onResult={setResult} />
      <Separator />
      <SubmissionDemoSection onResult={setResult} />
    </div>
  );
};
