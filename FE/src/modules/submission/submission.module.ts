import { ClipboardCheck, ClipboardList } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { GradingPage } from './pages/GradingPage';
import { MySubmissionPage } from './pages/MySubmissionPage';
import { StudentAssignmentPage } from './pages/StudentAssignmentPage';
import { StudentAssignmentsPage } from './pages/StudentAssignmentsPage';
import { SubmissionsReviewPage } from './pages/SubmissionsReviewPage';

export const submissionModule: AppModule = {
  routes: [
    { path: '/submissions', Component: SubmissionsReviewPage, roles: ['teacher', 'admin'] },
    { path: '/submissions/:id/grade', Component: GradingPage, roles: ['teacher', 'admin'] },
    { path: '/my-assignments', Component: StudentAssignmentsPage, roles: ['student'] },
    { path: '/my-assignments/:id', Component: StudentAssignmentPage, roles: ['student'] },
    { path: '/my-submissions/:id', Component: MySubmissionPage, roles: ['student'] },
  ],
  navItems: [
    { to: '/submissions', label: 'Grading', icon: ClipboardCheck, roles: ['teacher', 'admin'] },
    { to: '/my-assignments', label: 'My assignments', icon: ClipboardList, roles: ['student'] },
  ],
};
