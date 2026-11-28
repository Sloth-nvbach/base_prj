import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { HomePage } from './HomePage';

const getMe = vi.fn();
const stats = vi.fn();

vi.mock('@/modules/auth/api/auth.api', () => ({ authApi: { getMe: () => getMe() } }));
vi.mock('@/modules/admin/api/admin.api', () => ({ adminApi: { stats: () => stats() } }));
vi.mock('@/modules/assignment/api/assignment.api', () => ({
  assignmentApi: { list: () => Promise.resolve({ items: [], page: 1, limit: 5, total: 4, totalPages: 1 }) },
}));
vi.mock('@/modules/submission/api/submission.api', () => ({
  submissionApi: {
    listMine: () => Promise.resolve({ items: [], page: 1, limit: 1, total: 0, totalPages: 0 }),
    listForReview: () => Promise.resolve({ items: [], page: 1, limit: 1, total: 0, totalPages: 0 }),
  },
}));

beforeEach(() => {
  tokenStore.set('jwt-value');
  stats.mockReset();
});

describe('HomePage', () => {
  it('shows real admin numbers instead of placeholders', async () => {
    getMe.mockResolvedValue({ _id: 'a1', email: 'admin@example.com', role: 'admin', displayName: 'Ada' });
    stats.mockResolvedValue({ users: 15, admins: 1, verified: 12, notes: 0, newUsersThisWeek: 3 });

    renderWithProviders(<HomePage />);

    const overview = await screen.findByRole('region', { name: 'Overview' });
    expect(await within(overview).findByText('15')).toBeInTheDocument();
    expect(within(overview).getByText('3 new this week')).toBeInTheDocument();
    expect(within(overview).getByText('12')).toBeInTheDocument();
    expect(within(overview).queryByText('96% verified')).not.toBeInTheDocument();
  });

  it('does not ask for admin stats as a student', async () => {
    getMe.mockResolvedValue({ _id: 's1', email: 'student@example.com', role: 'student' });

    renderWithProviders(<HomePage />);

    expect(await screen.findByRole('heading', { name: /Welcome back, student/ })).toBeInTheDocument();
    expect(stats).not.toHaveBeenCalled();
  });
});
