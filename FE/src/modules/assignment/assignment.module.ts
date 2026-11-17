import { ClipboardList } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { AssignmentsListPage } from './pages/AssignmentsListPage';

export const assignmentModule: AppModule = {
  routes: [{ path: '/assignments', Component: AssignmentsListPage }],
  navItems: [{ to: '/assignments', label: 'Assignments', icon: ClipboardList, roles: ['teacher', 'admin'] }],
};