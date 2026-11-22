import { ClipboardCheck } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { GradingPage } from './pages/GradingPage';
import { SubmissionsReviewPage } from './pages/SubmissionsReviewPage';

export const submissionModule: AppModule = {
  routes: [
    { path: '/submissions', Component: SubmissionsReviewPage, roles: ['teacher', 'admin'] },
    { path: '/submissions/:id/grade', Component: GradingPage, roles: ['teacher', 'admin'] },
  ],
  navItems: [{ to: '/submissions', label: 'Grading', icon: ClipboardCheck, roles: ['teacher', 'admin'] }],
};
