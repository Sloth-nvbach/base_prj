export interface AuthPayload {
  email: string;
  password: string;
}

export type UserRole = 'user' | 'admin';

export interface CurrentUser {
  _id: string;
  email: string;
  isEmailVerified: boolean;
  role: UserRole;
  loginOtpEnabled: boolean;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  message: string;
}

/** `/auth/login` answers with a token, or asks for the emailed OTP when the user enabled it. */
export type LoginResponse =
  | { token: string }
  | { message: string; requiresOtp: true; email: string };
