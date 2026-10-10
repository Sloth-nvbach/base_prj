import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: string;
  email: string;
  /** Set by `requireRole` after it reads the role from the database. */
  role?: string;
}

export const signToken = (payload: JwtPayload) =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });

export const verifyToken = (token: string) => jwt.verify(token, env.jwtSecret) as JwtPayload;
