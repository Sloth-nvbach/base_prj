import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

interface Options {
  /** URL the test starts at. */
  route?: string;
  /** Route pattern the UI is mounted on (defaults to `route`). */
  path?: string;
  /** Extra routes, e.g. `{ '/logout': 'logout route' }` to assert redirects. */
  otherRoutes?: Record<string, string>;
  /** Pre-filled client, for tests that need cached data before the first render. */
  queryClient?: QueryClient;
}

/** A fresh client per test: no retries, no shared cache between tests. */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

/** Renders `ui` inside a QueryClientProvider and a MemoryRouter. */
export const renderWithProviders = (
  ui: ReactElement,
  { route = '/', path, otherRoutes = {}, queryClient = createTestQueryClient() }: Options = {},
) => {
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path ?? route.split('?')[0]} element={ui} />
          {Object.entries(otherRoutes).map(([otherPath, text]) => (
            <Route key={otherPath} path={otherPath} element={<div>{text}</div>} />
          ))}
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, queryClient };
};
