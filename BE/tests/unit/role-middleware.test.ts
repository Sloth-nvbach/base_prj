import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { requireRole } from '../../src/middlewares/role.middleware';
import { UserModel } from '../../src/models/user.model';
import { AppError } from '../../src/utils/app-error';

const buildContext = (userPayload?: { sub: string; email: string }) => {
  const req = userPayload ? { user: userPayload } : {} as Request;
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  return { req, res, next };
};

const createQueryMock = (result: any) => ({
  select: vi.fn().mockResolvedValue(result),
});

describe('requireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws AppError 401 when req.user is missing', async () => {
    const { req, res, next } = buildContext();
    const middleware = requireRole('admin');

    await expect(middleware(req, res, next)).rejects.toThrow(AppError);
    await expect(middleware(req, res, next)).rejects.toMatchObject({ status: 401, message: 'Unauthorized' });
    expect(next).not.toHaveBeenCalled();
  });

  it('throws AppError 401 when user not found in database', async () => {
    const { req, res, next } = buildContext({ sub: 'user-id', email: 'user@example.com' });
    vi.spyOn(UserModel, 'findById').mockReturnValue(createQueryMock(null) as any);
    const middleware = requireRole('admin');

    await expect(middleware(req, res, next)).rejects.toThrow(AppError);
    await expect(middleware(req, res, next)).rejects.toMatchObject({ status: 401, message: 'Unauthorized' });
    expect(UserModel.findById).toHaveBeenCalledWith('user-id');
    expect(next).not.toHaveBeenCalled();
  });

  it('throws AppError 403 when user role not in allowed roles', async () => {
    const { req, res, next } = buildContext({ sub: 'user-id', email: 'user@example.com' });
    vi.spyOn(UserModel, 'findById').mockReturnValue(createQueryMock({ role: 'student' }) as any);
    const middleware = requireRole('admin', 'teacher');

    await expect(middleware(req, res, next)).rejects.toThrow(AppError);
    await expect(middleware(req, res, next)).rejects.toMatchObject({ status: 403, message: 'You do not have permission to do this' });
    expect(UserModel.findById).toHaveBeenCalledWith('user-id');
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() and sets req.user.role when user has allowed role', async () => {
    const { req, res, next } = buildContext({ sub: 'user-id', email: 'user@example.com' });
    vi.spyOn(UserModel, 'findById').mockReturnValue(createQueryMock({ role: 'admin' }) as any);
    const middleware = requireRole('admin', 'teacher');

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ sub: 'user-id', email: 'user@example.com', role: 'admin' });
    expect(UserModel.findById).toHaveBeenCalledWith('user-id');
  });

  it('allows multiple roles and picks the first matching one', async () => {
    const { req, res, next } = buildContext({ sub: 'user-id', email: 'user@example.com' });
    vi.spyOn(UserModel, 'findById').mockReturnValue(createQueryMock({ role: 'teacher' }) as any);
    const middleware = requireRole('admin', 'teacher', 'student');

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user?.role).toBe('teacher');
  });

  it('works with a single role argument', async () => {
    const { req, res, next } = buildContext({ sub: 'user-id', email: 'user@example.com' });
    vi.spyOn(UserModel, 'findById').mockReturnValue(createQueryMock({ role: 'student' }) as any);
    const middleware = requireRole('student');

    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user?.role).toBe('student');
  });
});