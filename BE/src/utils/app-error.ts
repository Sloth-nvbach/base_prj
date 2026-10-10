/**
 * An expected failure that maps to a specific HTTP status.
 * Throw it from controllers or services; `errorMiddleware` turns it into
 * `{ message, errors? }` with the given status.
 */
export class AppError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const badRequest = (message = 'Bad request', details?: unknown) => new AppError(400, message, details);
export const unauthorized = (message = 'Unauthorized') => new AppError(401, message);
export const forbidden = (message = 'Forbidden') => new AppError(403, message);
export const notFound = (message = 'Not found') => new AppError(404, message);
export const conflict = (message = 'Conflict') => new AppError(409, message);
