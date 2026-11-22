import { ClipboardList } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { AssignmentDetailPage } from './pages/AssignmentDetailPage';
import { AssignmentsListPage } from './pages/AssignmentsListPage';

export const assignmentModule: AppModule = {
  routes: [
    { path: '/assignments', Component: AssignmentsListPage, roles: ['teacher', 'admin'] },
    { path: '/assignments/:id', Component: AssignmentDetailPage, roles: ['teacher', 'admin'] },
  ],
  navItems: [{ to: '/assignments', label: 'Assignments', icon: ClipboardList, roles: ['teacher', 'admin'] }],
};