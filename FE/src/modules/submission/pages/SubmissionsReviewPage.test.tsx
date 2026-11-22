import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { SubmissionsReviewPage } from './SubmissionsReviewPage';

const listForReview = vi.fn();

vi.mock('../api/submission.api', () => ({ submissionApi: { listForReview: (p: unknown) => listForReview(p) } }));
vi.mock('@/modules/assignment/api/assignment.api', () => ({
  assignmentApi: { list: () => Promise.resolve({ items: [{ _id: 'a1', title: 'Sum' }], page: 1, limit: 100, total: 1, totalPages: 1 }) },
}));
vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => Promise.resolve({ _id: 't1', email: 't@x.com', role: 'teacher' }) },
}));

beforeEach(() => {
  tokenStore.set('jwt');
  listForReview.mockReset().mockResolvedValue({
    items: [
      {
        _id: 'sub1', assignment: { _id: 'a1', title: 'Sum', maxScore: 10 }, student: { _id: 's1', email: 'lan@x.com', displayName: 'Lan' },
        code: '', language: 'python', submittedAt: '2026-11-20T10:00:00.000Z', status: 'submitted', feedback: '', createdAt: '',
        runStatus: 'completed', totalScore: 1, maxScore: 2,
        testResults: [{ testCaseId: 't', passed: true }, { testCaseId: 'u', passed: false }],
      },
    ],
    page: 1, limit: 20, total: 1, totalPages: 1,
  });
});

describe('SubmissionsReviewPage', () => {
  it('lists submissions with test summary and a grade link, filtered from the URL', async () => {
    renderWithProviders(<SubmissionsReviewPage />, { route: '/submissions?assignment=a1&status=submitted' });
    expect(await screen.findByText('Lan')).toBeInTheDocument();
    expect(screen.getAllByText('1/2')).toHaveLength(2); // tests passed + auto-score
    expect(screen.getByRole('link', { name: 'Grade' })).toHaveAttribute('href', '/submissions/sub1/grade');
    expect(listForReview).toHaveBeenCalledWith(expect.objectContaining({ assignment: 'a1', status: 'submitted', sort: '-submittedAt' }));
  });
});
