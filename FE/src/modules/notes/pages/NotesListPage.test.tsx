// Reference module tests: copy this file when creating a new feature.
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/modules/auth/store/token.store';
import { renderWithProviders } from '@/test/render-with-providers';
import { NotesListPage } from './NotesListPage';

const list = vi.fn();
const create = vi.fn();
const remove = vi.fn();

vi.mock('../api/notes.api', () => ({
  notesApi: {
    list: (params: unknown) => list(params),
    create: (input: unknown) => create(input),
    remove: (id: string) => remove(id),
  },
}));

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: { getMe: () => Promise.resolve({ _id: 'u1', email: 'a@b.com', role: 'user' }) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const note = {
  _id: 'n1',
  title: 'Math homework',
  content: 'Page 42',
  tags: ['math'],
  owner: 'u1',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

const page = (items: unknown[]) => ({ items, page: 1, limit: 12, total: items.length, totalPages: 1 });

const renderPage = () => renderWithProviders(<NotesListPage />, { route: '/notes' });

beforeEach(() => {
  tokenStore.set('jwt-value');
  list.mockReset().mockResolvedValue(page([note]));
  create.mockReset();
  remove.mockReset();
});

describe('NotesListPage', () => {
  it('lists the notes of the first page', async () => {
    renderPage();

    expect(await screen.findByText('Math homework')).toBeInTheDocument();
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, limit: 12 }));
  });

  it('shows an empty state with a create button', async () => {
    list.mockResolvedValue(page([]));
    renderPage();

    expect(await screen.findByText('No notes yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create note' })).toBeInTheDocument();
  });

  it('shows the backend error with a retry button', async () => {
    list.mockRejectedValue({ response: { status: 500, data: { message: 'Database offline' } } });
    renderPage();

    expect(await screen.findByText('Database offline')).toBeInTheDocument();
    list.mockResolvedValue(page([note]));
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Math homework')).toBeInTheDocument();
  });

  it('searches after the user stops typing', async () => {
    renderPage();
    await screen.findByText('Math homework');

    fireEvent.change(screen.getByLabelText('Search notes'), { target: { value: 'physics' } });

    await waitFor(() => expect(list).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'physics' })));
  });

  it('creates a note from the dialog, splitting the tags', async () => {
    create.mockResolvedValue({ ...note, _id: 'n2', title: 'Essay' });
    renderPage();
    await screen.findByText('Math homework');

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Title'), { target: { value: 'Essay' } });
    fireEvent.change(within(dialog).getByLabelText('Tags'), { target: { value: 'english, draft ,' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(create).toHaveBeenCalledWith({ title: 'Essay', content: '', tags: ['english', 'draft'] }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('does not submit without a title', async () => {
    renderPage();
    await screen.findByText('Math homework');

    fireEvent.click(screen.getByRole('button', { name: 'New note' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create' }));

    expect(await within(dialog).findByText('Title is required')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('deletes a note after confirmation', async () => {
    remove.mockResolvedValue(undefined);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete Math homework' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(remove).toHaveBeenCalledWith('n1'));
  });
});
