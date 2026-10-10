import { afterEach, describe, expect, it, vi } from 'vitest';

describe('cloudinary service without credentials', () => {
  afterEach(() => {
    vi.doUnmock('../../src/config/cloudinary');
    vi.resetModules();
  });

  const loadUnconfigured = async () => {
    vi.resetModules();
    vi.doMock('../../src/config/cloudinary', () => ({ isCloudinaryConfigured: false, cloudinary: {} }));
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    return import('../../src/services/cloudinary.service');
  };

  it('rejects uploads with a 503 that explains what to configure', async () => {
    const { uploadImage } = await loadUnconfigured();
    await expect(uploadImage(Buffer.from('x'), 'avatars')).rejects.toMatchObject({
      status: 503,
      message: expect.stringContaining('CLOUDINARY_')
    });
  });

  it('treats deletes as a no-op', async () => {
    const { deleteImage } = await loadUnconfigured();
    await expect(deleteImage('avatars/x')).resolves.toBeUndefined();
  });
});
