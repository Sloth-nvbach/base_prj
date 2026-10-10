import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

interface ErrorBody {
  message: string;
  errors?: unknown;
  stack?: string;
}

const toZodErrors = (error: ZodError) =>
  error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));

/** Errors from express.json() (body-parser / http-errors) carry a 4xx `status`. */
const clientErrorStatus = (error: unknown) => {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : undefined;
};

const BODY_ERROR_MESSAGES: Record<string, string> = {
  'entity.parse.failed': 'Invalid JSON body',
  'entity.too.large': 'Request body too large'
};

const isDuplicateKeyError = (error: unknown): error is { code: number; keyValue?: Record<string, unknown> } =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000;

/** Maps a thrown value to an HTTP status and a client-safe body. */
const resolveError = (error: unknown): { status: number; body: ErrorBody } => {
  if (error instanceof AppError) {
    const body: ErrorBody = { message: error.message };
    if (error.details !== undefined) body.errors = error.details;
    return { status: error.status, body };
  }

  if (error instanceof ZodError) {
    return { status: 400, body: { message: 'Validation failed', errors: toZodErrors(error) } };
  }

  if (error instanceof MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return { status, body: { message: error.message } };
  }

  if (error instanceof mongoose.Error.CastError) {
    return { status: 400, body: { message: `Invalid ${error.path}` } };
  }

  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((item) => ({ field: item.path, message: item.message }));
    return { status: 400, body: { message: 'Validation failed', errors } };
  }

  if (isDuplicateKeyError(error)) {
    const field = Object.keys(error.keyValue ?? {})[0];
    return { status: 409, body: { message: field ? `${field} already exists` : 'Duplicate value' } };
  }

  const status = clientErrorStatus(error);
  if (status) {
    const type = (error as { type?: string }).type ?? '';
    return { status, body: { message: BODY_ERROR_MESSAGES[type] ?? 'Bad request' } };
  }

  return { status: 500, body: { message: 'Internal server error' } };
};

export const errorMiddleware = (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const { status, body } = resolveError(error);

  // Expected failures (AppError, even 503) are not bugs: no log noise, no stack.
  if (status >= 500 && !(error instanceof AppError)) {
    console.error(error);
    if (env.nodeEnv === 'development' && error instanceof Error) body.stack = error.stack;
  }

  res.status(status).json(body);
};
