import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { ProtectedRoute } from './ProtectedRoute';

const getMe = vi.fn();

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => getMe() },
}));

const renderAdminPage = () =>
  renderWithProviders(
    <ProtectedRoute roles={['admin']}>
      <div>admin content</div>
    </ProtectedRoute>,
    { route: '/admin', otherRoutes: { '/': 'home page', '/login': 'login page' } },
  );

beforeEach(() => {
  tokenStore.set('jwt-value');
  getMe.mockReset();
});

describe('ProtectedRoute with roles', () => {
  it('renders the page for an allowed role', async () => {
    getMe.mockResolvedValue({ _id: '1', email: 'a@b.com', role: 'admin' });
    renderAdminPage();
    expect(await screen.findByText('admin content')).toBeInTheDocument();
  });

  it('sends other roles to the home page', async () => {
    getMe.mockResolvedValue({ _id: '1', email: 'a@b.com', role: 'user' });
    renderAdminPage();
    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
  });

  it('still sends visitors without a token to /login', () => {
    tokenStore.clear();
    renderAdminPage();
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(getMe).not.toHaveBeenCalled();
  });
});
