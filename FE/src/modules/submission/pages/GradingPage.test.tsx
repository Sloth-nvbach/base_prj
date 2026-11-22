import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import type { SubmissionDetail } from '../types/submission.types';
import { GradingPage } from './GradingPage';

const get = vi.fn();
const grade = vi.fn();
const finalize = vi.fn();
const aiReview = vi.fn();

vi.mock('../api/submission.api', () => ({
  submissionApi: {
    get: (id: string) => get(id),
    grade: (id: string, input: unknown) => grade(id, input),
    finalize: (id: string) => finalize(id),
    aiReview: (id: string) => aiReview(id),
  },
}));
vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => Promise.resolve({ _id: 't1', email: 't@x.com', role: 'teacher' }) },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const detail = (overrides: Partial<SubmissionDetail['submission']> = {}): SubmissionDetail => ({
  assignment: {
    _id: 'a1', title: 'Sum two numbers', description: 'Add', instructions: 'Read a b', createdBy: 't1',
    maxScore: 10, status: 'published', createdAt: '', updatedAt: '',
  },
  student: { _id: 's1', email: 'lan@x.com', displayName: 'Lan' },
  testCases: [
    { _id: 'tc1', assignmentId: 'a1', input: '1 2', expectedOutput: '3', isHidden: false, order: 0, points: 1, createdAt: '', updatedAt: '' },
    { _id: 'tc2', assignmentId: 'a1', input: '5 5', expectedOutput: '10', isHidden: true, order: 1, points: 1, createdAt: '', updatedAt: '' },
  ],
  rubric: {
    _id: 'r1', assignmentId: 'a1', createdAt: '', updatedAt: '',
    criteria: [
      { _id: 'c1', name: 'Correctness', description: '', weight: 60, maxScore: 10, order: 0, createdAt: '', updatedAt: '' },
      { _id: 'c2', name: 'Style', description: '', weight: 40, maxScore: 5, order: 1, createdAt: '', updatedAt: '' },
    ],
  },
  submission: {
    _id: 'sub1', assignment: 'a1', student: 's1', code: 'a, b = input().split()\nprint(a + b)', language: 'python',
    submittedAt: '2026-11-20T10:00:00.000Z', status: 'submitted', feedback: '', createdAt: '', runStatus: 'completed',
    testResults: [
      { testCaseId: 'tc1', passed: false, stdout: '12\n', stderr: '', exitCode: 0, executionTimeMs: 40, memoryUsedMB: 0, points: 0 },
      { testCaseId: 'tc2', passed: true, stdout: '10\n', stderr: '', exitCode: 0, executionTimeMs: 40, memoryUsedMB: 0, points: 1 },
    ],
    totalScore: 1,
    maxScore: 2,
    ...overrides,
  },
});

const renderPage = () => renderWithProviders(<GradingPage />, { route: '/submissions/sub1/grade', path: '/submissions/:id/grade' });

beforeEach(() => {
  tokenStore.set('jwt');
  get.mockReset().mockResolvedValue(detail());
  grade.mockReset().mockResolvedValue({});
  finalize.mockReset().mockResolvedValue({});
  aiReview.mockReset();
});

describe('GradingPage', () => {
  it('shows the problem, numbered code and per-test results', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Sum two numbers' })).toBeInTheDocument();
    expect(screen.getByText(/Lan · submitted/)).toBeInTheDocument();
    expect(within(screen.getByLabelText('Submitted code')).getByText('print(a + b)')).toBeInTheDocument();
    expect(screen.getByText('1/2 passed')).toBeInTheDocument();
    expect(screen.getByText(/Failed/)).toBeInTheDocument();
    expect(screen.getByText('(hidden)')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('sub1');
  });

  it('computes the total live and saves criterion scores as a draft', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(/Correctness/), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText(/Style/), { target: { value: '5' } });
    expect(screen.getByText('10', { selector: 'span' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Feedback for the student'), { target: { value: 'Well done' } });

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(grade).toHaveBeenCalledWith('sub1', { criterionScores: { c1: 10, c2: 5 }, feedback: 'Well done' }),
    );
  });

  it('rejects a score above the criterion maximum', async () => {
    renderPage();
    fireEvent.change(await screen.findByLabelText(/Style/), { target: { value: '9' } });
    fireEvent.change(screen.getByLabelText(/Correctness/), { target: { value: '1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('At most 5')).toBeInTheDocument();
    expect(grade).not.toHaveBeenCalled();
  });

  it('runs the AI review and fills the form with its suggestion', async () => {
    get.mockResolvedValueOnce(detail()).mockResolvedValue(
      detail({
        aiReview: {
          summary: 'Strings are concatenated.', confidence: 'medium', limitations: '', suggestedScore: 5,
          suggestedFeedback: 'Convert inputs with int().', generatedAt: '2026-11-20T10:00:00.000Z',
          issues: [{ title: 'String concatenation', severity: 'high', lineStart: 2, cause: 'split returns strings', fixSteps: ['Use int()'], concepts: ['types'] }],
          criterionSuggestions: [
            { criterionId: 'c1', name: 'Correctness', score: 4, maxScore: 10, weight: 60, reason: 'wrong sum' },
            { criterionId: 'c2', name: 'Style', score: 4, maxScore: 5, weight: 40, reason: 'ok' },
          ],
        },
      }),
    );
    aiReview.mockResolvedValue({});
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Run AI review' }));
    expect(await screen.findByText('Strings are concatenated.')).toBeInTheDocument();
    expect(screen.getByText(/line 2/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Use AI suggestion as draft' }));
    expect(screen.getByLabelText(/Correctness/)).toHaveValue(4);
    expect(screen.getByLabelText('Feedback for the student')).toHaveValue('Convert inputs with int().');
    expect(grade).not.toHaveBeenCalled(); // a suggestion is not saved until the teacher saves
  });

  it('finalizes a saved grade after confirmation', async () => {
    get.mockResolvedValue(detail({ score: 6, criterionScores: [] }));
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Finalize grade' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Finalize' }));
    await waitFor(() => expect(finalize).toHaveBeenCalledWith('sub1'));
  });

  it('locks a finalized grade for teachers', async () => {
    get.mockResolvedValue(detail({ status: 'graded', score: 6 }));
    renderPage();
    expect(await screen.findByText('This grade is finalized. Only an admin can change it.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Correctness/)).toBeDisabled();
  });
});
