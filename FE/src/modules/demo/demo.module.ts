import { FlaskConical } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { SprintDemoPage } from './pages/SprintDemoPage';

/**
 * Sprint-demo console for the backend features of this sprint. It is a testing
 * tool (raw HTTP answers on purpose), not the final student/teacher UI — those
 * come as their own modules later.
 */
export const demoModule: AppModule = {
  routes: [{ path: '/demo', Component: SprintDemoPage }],
  navItems: [{ to: '/demo', label: 'Sprint Demo', icon: FlaskConical }]
};
