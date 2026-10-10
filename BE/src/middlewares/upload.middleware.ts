import multer, { memoryStorage } from 'multer';
import { badRequest } from '../utils/app-error';

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Accepts one image up to 5 MB, kept in memory for `uploadImage()`.
 * Too-large files answer 413, other types 400 (see `errorMiddleware`).
 *
 *   router.post('/cover', authGuard, imageUpload.single('image'), uploadCover);
 */
export const imageUpload = multer({
  storage: memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(badRequest('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  }
});
