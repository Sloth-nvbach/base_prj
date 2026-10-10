import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { ProfilePage } from './ProfilePage';

const getMe = vi.fn();

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => getMe() },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const profile = {
  _id: 'user-1',
  email: 'alice@example.com',
  role: 'user',
  loginOtpEnabled: false,
  displayName: 'Alice',
  bio: 'Hello',
  phone: '0123456789',
};

const renderPage = () => renderWithProviders(<ProfilePage />, { route: '/profile' });

beforeEach(() => {
  tokenStore.set('jwt-value');
  getMe.mockReset().mockResolvedValue(profile);
});

describe('ProfilePage', () => {
  it('shows a loading placeholder before the request resolves', () => {
    renderPage();
    expect(screen.getAllByText('Loading…').length).toBeGreaterThan(0);
  });

  it('fetches the current user once and renders it', async () => {
    renderPage();

    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Alice')).toBeInTheDocument();
    expect(getMe).toHaveBeenCalledOnce();
  });

  it('does not render the edit form until the user is loaded', async () => {
    renderPage();
    expect(screen.queryByLabelText('Display Name')).not.toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Display Name')).toBeInTheDocument());
  });

  it('shows the login code switch reflecting the saved setting', async () => {
    renderPage();
    const toggle = await screen.findByRole('switch', { name: 'Email code at login' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });
});
