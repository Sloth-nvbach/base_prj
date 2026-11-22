import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { progressByAssignment, type Submission } from '../types/submission.types';
import { MySubmissionPage } from './MySubmissionPage';
import { StudentAssignmentPage } from './StudentAssignmentPage';
import { StudentAssignmentsPage } from './StudentAssignmentsPage';

const api = { listMine: vi.fn(), get: vi.fn(), create: vi.fn(), run: vi.fn(), runResult: vi.fn() };
const assignments = { list: vi.fn(), get: vi.fn(), getSubmissionAccess: vi.fn() };

vi.mock('../api/submission.api', () => ({
  submissionApi: {
    listMine: (p: unknown) => api.listMine(p),
    get: (id: string) => api.get(id),
    create: (input: unknown) => api.create(input),
    run: (id: string) => api.run(id),
    runResult: (id: string, job: string) => api.runResult(id, job),
  },
}));
vi.mock('@/modules/assignment/api/assignment.api', () => ({
  assignmentApi: {
    list: (p: unknown) => assignments.list(p),
    get: (id: string) => assignments.get(id),
    getSubmissionAccess: (id: string) => assignments.getSubmissionAccess(id),
  },
}));
vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => Promise.resolve({ _id: 's1', email: 's@x.com', role: 'student' }) },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const assignment = { _id: 'a1', title: 'Sum two numbers', description: '', instructions: 'Read a b, print a+b', createdBy: 't', maxScore: 10, status: 'published', createdAt: '', updatedAt: '' };
const page = (items: unknown[]) => ({ items, page: 1, limit: 20, total: items.length, totalPages: 1 });
const submission = (overrides: Partial<Submission> = {}): Submission => ({
  _id: 'sub1', assignment: 'a1', student: 's1', code: 'print(1)', language: 'python', submittedAt: '2026-11-20T10:00:00.000Z',
  status: 'submitted', feedback: '', createdAt: '', runStatus: 'completed',
  testResults: [
    { testCaseId: 'tc1', passed: true, stdout: '3\n', stderr: '', exitCode: 0, executionTimeMs: 30, memoryUsedMB: 0, points: 1, hidden: false },
    { testCaseId: 'tc2', passed: false, stdout: '', stderr: '', exitCode: 0, executionTimeMs: 30, memoryUsedMB: 0, points: 0, hidden: true },
  ],
  ...overrides,
});

beforeEach(() => {
  tokenStore.set('jwt');
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(assignments).forEach((fn) => fn.mockReset());
  assignments.get.mockResolvedValue(assignment);
  assignments.list.mockResolvedValue(page([assignment]));
  assignments.getSubmissionAccess.mockResolvedValue({ canSubmit: true });
  api.listMine.mockResolvedValue(page([]));
});

describe('progressByAssignment', () => {
  it('counts attempts and keeps the best finalized score', () => {
    const map = progressByAssignment([
      submission({ _id: '1', status: 'graded', score: 6 }),
      submission({ _id: '2', status: 'graded', score: 8 }),
      submission({ _id: '3' }),
    ]);
    expect(map.get('a1')).toEqual({ attempts: 3, status: 'graded', bestScore: 8 });
  });
});

describe('StudentAssignmentsPage', () => {
  it('shows each exercise with my status and attempts', async () => {
    api.listMine.mockResolvedValue(page([submission(), submission({ _id: 'sub2' })]));
    renderWithProviders(<StudentAssignmentsPage />, { route: '/my-assignments' });
    expect(await screen.findByRole('link', { name: 'Sum two numbers' })).toHaveAttribute('href', '/my-assignments/a1');
    expect(await screen.findByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});

describe('StudentAssignmentPage', () => {
  const renderPage = () =>
    renderWithProviders(<StudentAssignmentPage />, {
      route: '/my-assignments/a1',
      path: '/my-assignments/:id',
      otherRoutes: { '/my-submissions/:id': 'submission page' },
    });

  it('submits code, starts the test run and opens the submission', async () => {
    api.create.mockResolvedValue(submission());
    api.run.mockResolvedValue({ jobId: '7' });
    renderPage();

    expect(await screen.findByText('Read a b, print a+b')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'a, b = map(int, input().split())\nprint(a + b)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit and run tests' }));

    expect(await screen.findByText('submission page')).toBeInTheDocument();
    expect(api.create).toHaveBeenCalledWith({ assignment: 'a1', language: 'python', code: 'a, b = map(int, input().split())\nprint(a + b)' });
    expect(api.run).toHaveBeenCalledWith('sub1');
  });

  it('does not submit empty code', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Submit and run tests' }));
    expect(await screen.findByText('Code cannot be empty')).toBeInTheDocument();
    expect(api.create).not.toHaveBeenCalled();
  });

  it('explains why submissions are closed', async () => {
    assignments.getSubmissionAccess.mockResolvedValue({ canSubmit: false, reason: 'Deadline has passed' });
    renderPage();
    expect(await screen.findByText('Submissions are closed: Deadline has passed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit and run tests' })).not.toBeInTheDocument();
  });
});

describe('MySubmissionPage', () => {
  const detail = (overrides: Partial<Submission> = {}) => ({
    submission: submission(overrides),
    assignment,
    student: null,
    rubric: null,
    testCases: [{ _id: 'tc1', assignmentId: 'a1', input: '1 2', expectedOutput: '3', isHidden: false, order: 0, points: 1, createdAt: '', updatedAt: '' }],
  });

  it('shows test results with hidden cases as pass/fail only, and waits for grading', async () => {
    api.get.mockResolvedValue(detail());
    renderWithProviders(<MySubmissionPage />, { route: '/my-submissions/sub1', path: '/my-submissions/:id' });
    expect(await screen.findByText('1/2 passed')).toBeInTheDocument();
    expect(screen.getByText('(hidden test case)')).toBeInTheDocument();
    expect(screen.getByText('Waiting for your teacher to grade this submission.')).toBeInTheDocument();
  });

  it('shows the final score and rubric once graded', async () => {
    api.get.mockResolvedValue(
      detail({ status: 'graded', score: 7, feedback: 'Good job', criterionScores: [{ criterionId: 'c1', name: 'Correctness', score: 7, maxScore: 10, weight: 100 }] }),
    );
    renderWithProviders(<MySubmissionPage />, { route: '/my-submissions/sub1', path: '/my-submissions/:id' });
    expect(await screen.findByText(/Final score/)).toBeInTheDocument();
    expect(screen.getByText('7', { selector: 'span' })).toBeInTheDocument();
  });

  it('polls a running job and refreshes when it finishes', async () => {
    api.get.mockResolvedValue(detail({ runStatus: undefined, testResults: [] }));
    api.runResult
      .mockResolvedValueOnce({ jobId: '7', status: 'active', submission: {} })
      .mockResolvedValue({ jobId: '7', status: 'completed', submission: {} });
    renderWithProviders(<MySubmissionPage />, { route: '/my-submissions/sub1?job=7', path: '/my-submissions/:id' });
    expect(await screen.findByText('Running your code against the test cases…')).toBeInTheDocument();
    await waitFor(() => expect(api.runResult).toHaveBeenCalledTimes(2), { timeout: 3000 });
    await waitFor(() => expect(api.get.mock.calls.length).toBeGreaterThan(1));
    expect(api.runResult).toHaveBeenCalledWith('sub1', '7');
  });
});
