import { Router } from 'express';
import { updateProfile, updateSecurity, uploadAvatar } from '../controllers/profile.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { imageUpload } from '../middlewares/upload.middleware';
import { validateBody } from '../middlewares/validate.middleware';
import { updateProfileSchema, updateSecuritySchema } from '../validators/profile.validator';

export const profileRouter = Router();

profileRouter.patch('/', authGuard, validateBody(updateProfileSchema), updateProfile);
profileRouter.patch('/security', authGuard, validateBody(updateSecuritySchema), updateSecurity);
profileRouter.post('/avatar', authGuard, imageUpload.single('avatar'), uploadAvatar);
