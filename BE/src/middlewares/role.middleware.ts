import { NextFunction, Request, Response } from 'express';
import { UserModel, UserRole } from '../models/user.model';
import { forbidden, unauthorized } from '../utils/app-error';

/**
 * Allows the request only when the signed-in user has one of `roles`.
 * Use after `authGuard`. The role is read from the database, so promoting a
 * user takes effect without a new login.
 *
 *   router.get('/admin/stats', authGuard, requireRole('admin'), getStats);
 */
export const requireRole = (...roles: UserRole[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw unauthorized();

    const user = await UserModel.findById(req.user.sub).select('role');
    if (!user) throw unauthorized();
    if (!roles.includes(user.role)) throw forbidden('You do not have permission to do this');

    req.user.role = user.role;
    next();
  };
};
