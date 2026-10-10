import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { validate } from '../../src/middlewares/validate.middleware';
import { paginationQuerySchema, sortSchema } from '../../src/utils/pagination';

const run = (schemas: Parameters<typeof validate>[0], req: Partial<Request>) => {
  // Mimic Express 5, where `req.query` is a getter that cannot be assigned.
  const { query, ...rest } = req;
  const request = { ...rest } as Request;
  Object.defineProperty(request, 'query', { get: () => query ?? {}, configurable: true });

  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  validate(schemas)(request, res, next);
  return { req: request, res, next };
};

describe('validate', () => {
  it('coerces the query string and applies defaults', () => {
    const { req, next } = run({ query: paginationQuerySchema }, { query: { page: '3' } });

    expect(next).toHaveBeenCalledOnce();
    expect(req.query).toEqual({ page: 3, limit: 20, sort: '-createdAt' });
  });

  it('validates params', () => {
    const { res, next } = run({ params: z.object({ id: z.string().length(24) }) }, { params: { id: 'short' } });

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(vi.mocked(res.json).mock.calls[0][0]).toMatchObject({ errors: [{ field: 'id' }] });
  });

  it('rejects a limit above 100 and an injected sort expression', () => {
    expect(run({ query: paginationQuerySchema }, { query: { limit: '500' } }).res.status).toHaveBeenCalledWith(400);
    expect(run({ query: paginationQuerySchema }, { query: { sort: '{$gt:1}' } }).res.status).toHaveBeenCalledWith(400);
  });

  it('only sorts by the allowed fields, ascending or descending', () => {
    const schema = paginationQuerySchema.extend({ sort: sortSchema(['createdAt', 'title']) });
    expect(run({ query: schema }, { query: { sort: '-title' } }).req.query).toMatchObject({ sort: '-title' });
    expect(run({ query: schema }, { query: { sort: 'password' } }).res.status).toHaveBeenCalledWith(400);
    expect(run({ query: paginationQuerySchema }, { query: { sort: 'resetToken' } }).res.status).toHaveBeenCalledWith(400);
  });

  it('validates body, query and params together', () => {
    const { req, next } = run(
      { body: z.object({ title: z.string() }), query: z.object({ draft: z.coerce.boolean() }) },
      { body: { title: 'Hi', extra: 1 }, query: { draft: 'true' } }
    );

    expect(next).toHaveBeenCalledOnce();
    expect(req.body).toEqual({ title: 'Hi' });
    expect(req.query).toEqual({ draft: true });
  });
});
