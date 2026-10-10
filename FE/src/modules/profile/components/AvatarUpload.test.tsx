import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvatarUpload } from './AvatarUpload';

const uploadAvatar = vi.fn();
const toastError = vi.fn();
const toastSuccess = vi.fn();

vi.mock('@/modules/profile/api/profile.api', () => ({
  profileApi: { uploadAvatar: (file: File) => uploadAvatar(file) },
}));

// Radix AvatarImage only mounts <img> after the browser loads it, which never happens in jsdom.
vi.mock('@/shared/components/ui/avatar', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (src ? <img src={src} alt={alt} /> : null),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('sonner', () => ({
  toast: {
    error: (message: string) => toastError(message),
    success: (message: string) => toastSuccess(message),
  },
}));

const NEW_URL = 'https://res.cloudinary.com/test/image/upload/v1/avatars/new.png';

const imageFile = (byteLength = 16, type = 'image/png', name = 'avatar.png') =>
  new File([new Uint8Array(byteLength)], name, { type });

const renderUpload = (onUploadSuccess = vi.fn()) => {
  const view = render(<AvatarUpload userInitials="AB" onUploadSuccess={onUploadSuccess} />);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { ...view, input, onUploadSuccess };
};

const selectFile = (input: HTMLInputElement, file: File) =>
  fireEvent.change(input, { target: { files: [file] } });

beforeEach(() => {
  uploadAvatar.mockReset().mockResolvedValue({ avatarUrl: NEW_URL });
  toastError.mockReset();
  toastSuccess.mockReset();
});

describe('AvatarUpload', () => {
  it('uploads the selected image and reports the new URL', async () => {
    const { input, onUploadSuccess } = renderUpload();

    selectFile(input, imageFile());

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith(NEW_URL));
    expect(uploadAvatar).toHaveBeenCalledOnce();
    expect(toastSuccess).toHaveBeenCalledWith('Avatar updated successfully.');
  });

  it('rejects a non-image file without calling the API', async () => {
    const { input, onUploadSuccess } = renderUpload();

    selectFile(input, new File(['%PDF'], 'doc.pdf', { type: 'application/pdf' }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Only image files are allowed.'));
    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it('rejects a file larger than 5MB without calling the API', async () => {
    const { input } = renderUpload();

    selectFile(input, imageFile(5 * 1024 * 1024 + 1));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Image must be under 5MB.'));
    expect(uploadAvatar).not.toHaveBeenCalled();
  });

  it('accepts a file exactly at the 5MB limit', async () => {
    const { input, onUploadSuccess } = renderUpload();

    selectFile(input, imageFile(5 * 1024 * 1024));

    await waitFor(() => expect(onUploadSuccess).toHaveBeenCalledWith(NEW_URL));
    expect(toastError).not.toHaveBeenCalled();
  });

  it('does nothing when the file dialog is dismissed', () => {
    const { input } = renderUpload();

    fireEvent.change(input, { target: { files: [] } });

    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
  });

  it('surfaces the server error message and resets the input for a retry', async () => {
    uploadAvatar.mockRejectedValue({ response: { data: { message: 'File too large' } } });
    const { input, onUploadSuccess } = renderUpload();

    selectFile(input, imageFile());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('File too large'));
    expect(onUploadSuccess).not.toHaveBeenCalled();
    expect(input.value).toBe('');
  });

  it('falls back to a generic message when the server sends none', async () => {
    uploadAvatar.mockRejectedValue(new Error('network down'));
    const { input } = renderUpload();

    selectFile(input, imageFile());

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Failed to upload avatar.'));
  });

  it('disables the trigger while an upload is in flight', async () => {
    let resolveUpload: ((value: unknown) => void) | undefined;
    uploadAvatar.mockReturnValue(new Promise((resolve) => { resolveUpload = resolve; }));
    const { input } = renderUpload();

    selectFile(input, imageFile());

    const trigger = screen.getByRole('button');
    await waitFor(() => expect(trigger).toBeDisabled());

    resolveUpload?.({ data: { avatarUrl: NEW_URL } });
    await waitFor(() => expect(trigger).not.toBeDisabled());
  });

  it('shows the avatar URL that arrives after the first render', () => {
    const { rerender } = render(<AvatarUpload onUploadSuccess={vi.fn()} />);
    expect(screen.queryByAltText('Profile avatar')).not.toBeInTheDocument();

    rerender(<AvatarUpload currentAvatarUrl={NEW_URL} onUploadSuccess={vi.fn()} />);
    expect(screen.getByAltText('Profile avatar')).toHaveAttribute('src', NEW_URL);
  });
});
