import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { SprintDemoPage } from './SprintDemoPage';

const listAssignments = vi.fn();
const listSubmissions = vi.fn();
const createAssignment = vi.fn();
const updateAssignment = vi.fn();
const deleteAssignment = vi.fn();
const getAssignment = vi.fn();
const checkSubmissionAccess = vi.fn();
const createSubmission = vi.fn();

vi.mock('../api/demo.api', () => ({
  demoApi: {
    listAssignments: () => listAssignments(),
    listSubmissions: () => listSubmissions(),
    getAssignment: (id: string) => getAssignment(id),
    createAssignment: (input: unknown) => createAssignment(input),
    updateAssignment: (id: string, input: unknown) => updateAssignment(id, input),
    deleteAssignment: (id: string) => deleteAssignment(id),
    checkSubmissionAccess: (id: string) => checkSubmissionAccess(id),
    createSubmission: (input: unknown) => createSubmission(input)
  }
}));

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => Promise.resolve({ _id: 'u1', email: 'student@example.com', role: 'student' }) }
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const assignment = {
  _id: 'a1',
  title: 'Loop exercises',
  description: 'Practice loops',
  instructions: '',
  status: 'published',
  maxScore: 100,
  dueDate: null,
  createdBy: 't1',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z'
};

const submission = {
  _id: 's1',
  assignment: { _id: 'a1', title: 'Loop exercises', status: 'published', maxScore: 100, dueDate: null },
  student: 'u1',
  code: 'console.log("first");',
  language: 'javascript',
  submittedAt: '2026-10-01T00:00:00.000Z',
  status: 'submitted',
  feedback: '',
  createdAt: '2026-10-01T00:00:00.000Z'
};

const pageOf = (items: unknown[]) => ({ items, page: 1, limit: 20, total: items.length, totalPages: 1 });

const renderPage = () => renderWithProviders(<SprintDemoPage />, { route: '/demo' });

beforeEach(() => {
  tokenStore.set('jwt-value');
  listAssignments.mockReset().mockResolvedValue(pageOf([assignment]));
  listSubmissions.mockReset().mockResolvedValue(pageOf([submission]));
  createAssignment.mockReset();
  updateAssignment.mockReset();
  deleteAssignment.mockReset();
  getAssignment.mockReset();
  checkSubmissionAccess.mockReset();
  createSubmission.mockReset();
});

describe('SprintDemoPage', () => {
  it('shows the assignments and the own submission history', async () => {
    renderPage();

    // The title appears three times: assignment row, submit-form option and the history row.
    expect(await screen.findAllByText('Loop exercises')).toHaveLength(3);
    expect(await screen.findByText('console.log("first");')).toBeInTheDocument();
    expect(screen.getByText('student@example.com')).toBeInTheDocument();
  });

  it('creates an assignment through the form and shows the raw 201 answer', async () => {
    renderPage();
    await screen.findByText('How to demo');
    createAssignment.mockResolvedValueOnce({
      status: 201,
      data: { _id: 'a2', title: 'New demo', status: 'draft' }
    });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New demo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    await waitFor(() =>
      expect(createAssignment).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New demo', description: '', maxScore: 100, status: 'draft' })
      )
    );
    expect(await screen.findByText('POST /api/assignments')).toBeInTheDocument();
    expect(screen.getByText('HTTP 201')).toBeInTheDocument();
  });

  it('submits code for the chosen assignment', async () => {
    renderPage();
    // Wait until the assignments list has rendered its options into the select.
    await screen.findAllByText('Loop exercises');
    createSubmission.mockResolvedValueOnce({ status: 201, data: submission });

    fireEvent.change(screen.getByLabelText('Assignment'), { target: { value: 'a1' } });
    fireEvent.change(screen.getByLabelText('Code'), { target: { value: 'console.log("hi");' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit code' }));

    await waitFor(() =>
      expect(createSubmission).toHaveBeenCalledWith({
        assignment: 'a1',
        code: 'console.log("hi");',
        language: 'javascript'
      })
    );
    expect(await screen.findByText('POST /api/submissions')).toBeInTheDocument();
  });

  it('shows the refused 403 answer in the result card', async () => {
    renderPage();
    await screen.findByText('How to demo');
    createAssignment.mockRejectedValueOnce({
      response: { status: 403, data: { message: 'You do not have permission to do this' } }
    });

    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create assignment' }));

    expect(await screen.findByText('HTTP 403')).toBeInTheDocument();
    expect(screen.getByText(/You do not have permission to do this/)).toBeInTheDocument();
  });
});
