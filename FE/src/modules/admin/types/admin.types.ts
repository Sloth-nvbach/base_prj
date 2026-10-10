import type { UserRole } from '@/modules/auth/types/auth.types';

export interface AdminStats {
  users: number;
  admins: number;
  verified: number;
  newUsersThisWeek: number;
  notes: number;
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: UserRole | '';
  /** `'true'` / `'false'`, or `''` for all users. */
  verified?: 'true' | 'false' | '';
  sort?: string;
}

export interface AdminUpdateUserInput {
  displayName?: string;
  role?: UserRole;
  isEmailVerified?: boolean;
  loginOtpEnabled?: boolean;
}
