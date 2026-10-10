// Reference module: copy this folder when creating a new feature (or run `npm run gen:module <name>`).
import { StickyNote } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { NotesListPage } from './pages/NotesListPage';

export const notesModule: AppModule = {
  routes: [{ path: '/notes', Component: NotesListPage }],
  navItems: [{ to: '/notes', label: 'Notes', icon: StickyNote }],
};
