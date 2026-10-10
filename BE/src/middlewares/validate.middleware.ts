import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodType } from 'zod';

interface RequestSchemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

const toFieldErrors = (error: ZodError) =>
  error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message }));

/**
 * Validates and coerces any part of the request with Zod. Parsed values replace
 * the originals, so controllers read typed data from `req.body`, `req.query`
 * and `req.params`. Failures answer 400 `{ message, errors: [{ field, message }] }`.
 *
 *   router.get('/', validate({ query: listNotesQuerySchema }), listNotes);
 */
export const validate = (schemas: RequestSchemas) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request['params'];
      if (schemas.query) {
        // Express 5 exposes `req.query` as a getter, so it is redefined instead of assigned.
        Object.defineProperty(req, 'query', {
          value: schemas.query.parse(req.query),
          writable: true,
          configurable: true,
          enumerable: true
        });
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: 'Validation failed', errors: toFieldErrors(error) });
      }

      return res.status(400).json({ message: 'Invalid payload' });
    }
  };
};

/** Shorthand for `validate({ body: schema })`. */
export const validateBody = <T>(schema: ZodType<T>) => validate({ body: schema });
