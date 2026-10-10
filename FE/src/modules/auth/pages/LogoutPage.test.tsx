import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { currentUserKey } from '../hooks/use-current-user';
import { tokenStore } from '../store/token.store';
import { createTestQueryClient, renderWithProviders } from '@/test/render-with-providers';
import { LogoutPage } from './LogoutPage';

describe('LogoutPage', () => {
  it('clears the token and the cached data, then redirects to the login page', async () => {
    tokenStore.set('jwt-value');

    // Data cached by the previous user must not survive the logout.
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(currentUserKey, { email: 'previous@example.com' });

    renderWithProviders(<LogoutPage />, {
      route: '/logout',
      otherRoutes: { '/login': 'login page' },
      queryClient,
    });

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
    expect(queryClient.getQueryData(currentUserKey)).toBeUndefined();
  });
});
