import { cloudinary, isCloudinaryConfigured } from '../config/cloudinary';
import { AppError } from '../utils/app-error';

if (!isCloudinaryConfigured) {
  console.warn('Warning: Cloudinary env vars not set. Image upload answers 503 until they are.');
}

/**
 * Uploads an image buffer to Cloudinary under the given folder.
 * Returns the secure URL and public ID of the uploaded asset.
 */
export const uploadImage = (buffer: Buffer, folder: string): Promise<{ url: string; publicId: string }> => {
  if (!isCloudinaryConfigured) {
    return Promise.reject(
      new AppError(503, 'Image upload is not configured. Set the CLOUDINARY_* variables in BE/.env.')
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Deletes an image from Cloudinary by its public ID.
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  if (!isCloudinaryConfigured) return;
  await cloudinary.uploader.destroy(publicId);
};
