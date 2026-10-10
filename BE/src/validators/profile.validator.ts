import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  bio: z.string().trim().max(200).optional(),
  phone: z.string().trim().min(7).max(20).optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const updateSecuritySchema = z.object({
  loginOtpEnabled: z.boolean()
});

export type UpdateSecurityInput = z.infer<typeof updateSecuritySchema>;
