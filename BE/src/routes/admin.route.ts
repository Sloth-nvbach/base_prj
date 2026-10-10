import { Router } from 'express';
import { bulkDeleteUsers, deleteUser, getStats, getUser, listUsers, updateUser } from '../controllers/admin.controller';
import { authGuard } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { adminUpdateUserSchema, listUsersQuerySchema } from '../validators/admin-user.validator';
import { bulkIdsSchema, idParamsSchema } from '../validators/common.validator';

export const adminRouter = Router();

// Base project: every signed-in account can use the admin API, so the sample is
// easy to try. Before real users join, allow admins only by replacing the line with:
//   adminRouter.use(authGuard, requireRole('admin'));   // import from '../middlewares/role.middleware'
// (and add `roles={['admin']}` to the admin route in FE/src/App.tsx).
adminRouter.use(authGuard);

adminRouter.get('/stats', getStats);
adminRouter.get('/users', validate({ query: listUsersQuerySchema }), listUsers);
adminRouter.post('/users/bulk-delete', validate({ body: bulkIdsSchema }), bulkDeleteUsers);
adminRouter.get('/users/:id', validate({ params: idParamsSchema }), getUser);
adminRouter.patch('/users/:id', validate({ params: idParamsSchema, body: adminUpdateUserSchema }), updateUser);
adminRouter.delete('/users/:id', validate({ params: idParamsSchema }), deleteUser);
