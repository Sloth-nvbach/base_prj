import mongoose, { Schema } from 'mongoose';

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserDocument extends mongoose.Document {
  email: string;
  password: string;
  isEmailVerified: boolean;
  role: UserRole;
  /** When true, login sends an email OTP before issuing a token. */
  loginOtpEnabled: boolean;
  otpCode?: string;
  otpExpiresAt?: Date;
  resetToken?: string;
  resetTokenExpiresAt?: Date;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  avatarPublicId?: string;
  phone?: string;
}

/** Fields that must never leave the server. Stripped from every JSON response. */
export const PRIVATE_USER_FIELDS = [
  'password',
  'otpCode',
  'otpExpiresAt',
  'resetToken',
  'resetTokenExpiresAt',
  '__v'
] as const;

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    isEmailVerified: { type: Boolean, default: false },
    role: { type: String, enum: USER_ROLES, default: 'user' },
    loginOtpEnabled: { type: Boolean, default: false },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    resetToken: { type: String },
    resetTokenExpiresAt: { type: Date },
    displayName: { type: String, trim: true },
    bio: { type: String, maxlength: 200 },
    avatarUrl: { type: String },
    avatarPublicId: { type: String },
    phone: { type: String, trim: true }
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: Record<string, unknown>) => {
        for (const field of PRIVATE_USER_FIELDS) delete ret[field];
        return ret;
      }
    }
  }
);

export const UserModel = mongoose.model<UserDocument>('User', userSchema);
