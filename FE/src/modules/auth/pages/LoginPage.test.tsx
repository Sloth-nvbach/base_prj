import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { LoginPage } from './LoginPage';

const login = vi.fn();

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { login: (payload: unknown) => login(payload) },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

const submit = () => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
};

const renderPage = () =>
  renderWithProviders(<LoginPage />, { route: '/login', otherRoutes: { '/': 'home page' } });

beforeEach(() => {
  login.mockReset();
});

describe('LoginPage', () => {
  it('stores the token and opens the home page when no email code is needed', async () => {
    login.mockResolvedValue({ token: 'jwt-value' });
    renderPage();

    submit();

    expect(await screen.findByText('home page')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('jwt-value');
    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret123' });
  });

  it('asks for the emailed code when the user turned it on', async () => {
    login.mockResolvedValue({ message: 'OTP sent', requiresOtp: true, email: 'a@b.com' });
    renderPage();

    submit();

    expect(await screen.findByText('Verify OTP')).toBeInTheDocument();
    await waitFor(() => expect(tokenStore.get()).toBeNull());
  });
});
