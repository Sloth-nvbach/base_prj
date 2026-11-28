import { useEffect, type ComponentType } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import type { NavItem } from '@/app/module.types';
import { ThemeToggle } from '@/shared/components/ui/theme-toggle';
import { useCurrentUser, useLogout } from '@/modules/auth/hooks/use-current-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar';
import { Button } from '@/shared/components/ui/button';
import { Brand } from '@/shared/components/brand';
import { FetchIndicator } from '@/shared/components/fetch-indicator';
import { cn } from '@/shared/lib/utils';

interface AppLayoutProps {
  navItems: NavItem[];
  /** Floating components from the module registry (e.g. the chat button). */
  widgets?: ComponentType[];
}

/** Editor-style tab: amber underline marks the open section. */
const navTabClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'relative inline-flex h-full shrink-0 items-center gap-1.5 px-3 font-mono text-[0.8125rem] transition-colors focus-visible:outline-offset-[-2px]',
    'after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:origin-left after:bg-primary after:transition-transform after:duration-200',
    isActive ? 'text-foreground after:scale-x-100' : 'text-muted-foreground after:scale-x-0 hover:text-foreground'
  );

export const AppLayout = ({ navItems: allNavItems, widgets = [] }: AppLayoutProps) => {
  // An expired or rejected token answers 401, which the http interceptor turns
  // into a redirect to /logout. Other failures (server down) keep the user signed in.
  const { data: user } = useCurrentUser();
  const location = useLocation();
  const handleLogout = useLogout();

  // On phones the nav scrolls sideways: keep the current section in view.
  useEffect(() => {
    document.querySelector('nav[aria-label="Main"] [aria-current="page"]')?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [location.pathname, user?.role]);

  const navItems = allNavItems.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? '??';

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only z-[60] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b bg-sidebar">
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 px-4 sm:h-12 sm:flex-nowrap sm:px-6">
          <Link to="/" className="flex h-12 items-center rounded-sm" aria-label="Smart EdTech home">
            <Brand />
          </Link>

          {/* One nav for all widths: a scrollable second row on phones, inline tabs from sm up. */}
          <nav
            aria-label="Main"
            className="order-last -mx-4 flex h-10 w-[calc(100%+2rem)] overflow-x-auto border-t px-1 [scrollbar-width:none] sm:order-none sm:mx-0 sm:h-12 sm:w-auto sm:border-t-0 sm:px-0"
          >
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navTabClass}>
                <item.icon className="size-4" aria-hidden="true" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex h-12 items-center gap-1">
            <ThemeToggle />
            <Link to="/profile" className="rounded-full" aria-label="Your profile">
              <Avatar className="size-7">
                <AvatarImage src={user?.avatarUrl} alt="" />
                <AvatarFallback className="font-mono text-[0.6875rem]">{initials}</AvatarFallback>
              </Avatar>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-muted-foreground hover:text-foreground">
              <LogOut className="size-4" />
              <span className="sr-only md:not-sr-only">Logout</span>
            </Button>
          </div>

          <FetchIndicator />
        </div>
      </header>

      {/* Keyed by path so each page fades in once when you navigate to it. */}
      <main id="main" key={location.pathname} className="mx-auto max-w-6xl animate-fade px-4 pt-6 pb-24 sm:px-6 sm:pt-8">
        <Outlet />
      </main>

      {widgets.map((Widget, index) => (
        <Widget key={index} />
      ))}
    </div>
  );
};
