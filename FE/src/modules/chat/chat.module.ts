import type { AppModule } from '@/app/module.types';
import { ChatWidget } from './components/ChatWidget';

/** No page of its own: the chat is a floating button + popup on every page. */
export const chatModule: AppModule = {
  routes: [],
  widgets: [ChatWidget],
};
