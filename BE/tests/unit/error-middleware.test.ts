import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { errorMiddleware } from '../../src/middlewares/error.middleware';
import { AppError, conflict, notFound } from '../../src/utils/app-error';

const run = (error: unknown) => {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  errorMiddleware(error, {} as Request, res, vi.fn() as unknown as NextFunction);
  return {
    status: vi.mocked(res.status).mock.calls[0][0],
    body: vi.mocked(res.json).mock.calls[0][0] as { message: string; errors?: unknown; stack?: string }
  };
};

describe('errorMiddleware', () => {
  it('uses the status and message of an AppError', () => {
    expect(run(notFound('Note not found'))).toEqual({ status: 404, body: { message: 'Note not found' } });
    expect(run(conflict()).status).toBe(409);
  });

  it('passes AppError details through as `errors`', () => {
    const { body } = run(new AppError(400, 'Bad', [{ field: 'x', message: 'y' }]));
    expect(body.errors).toEqual([{ field: 'x', message: 'y' }]);
  });

  it('maps a ZodError to 400 with a field list', () => {
    const result = z.object({ email: z.string().email() }).safeParse({ email: 'nope' });
    const { status, body } = run(result.error);
    expect(status).toBe(400);
    expect(body.errors).toEqual([{ field: 'email', message: expect.any(String) }]);
  });

  it('maps multer errors to 413 for size and 400 otherwise', () => {
    expect(run(new MulterError('LIMIT_FILE_SIZE')).status).toBe(413);
    expect(run(new MulterError('LIMIT_UNEXPECTED_FILE')).status).toBe(400);
  });

  it('maps an invalid ObjectId to 400', () => {
    const error = new mongoose.Error.CastError('ObjectId', 'abc', '_id');
    expect(run(error)).toEqual({ status: 400, body: { message: 'Invalid _id' } });
  });

  it('maps a Mongoose validation error to 400 with a field list', () => {
    const error = new mongoose.Error.ValidationError();
    error.addError('title', new mongoose.Error.ValidatorError({ path: 'title', message: 'Title is required' }));
    expect(run(error)).toEqual({
      status: 400,
      body: { message: 'Validation failed', errors: [{ field: 'title', message: 'Title is required' }] }
    });
  });

  it('maps a duplicate key error to 409', () => {
    const error = Object.assign(new Error('E11000'), { code: 11000, keyValue: { email: 'a@b.com' } });
    expect(run(error)).toEqual({ status: 409, body: { message: 'email already exists' } });
  });

  it('does not log or attach a stack for an expected 5xx AppError', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new AppError(503, 'Image upload is not configured'));
    expect(status).toBe(503);
    expect(body).toEqual({ message: 'Image upload is not configured' });
    expect(log).not.toHaveBeenCalled();
  });

  it('hides the message of unexpected errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { status, body } = run(new Error('connection string with password leaked'));
    expect(status).toBe(500);
    expect(body).toEqual({ message: 'Internal server error' });
  });
});
