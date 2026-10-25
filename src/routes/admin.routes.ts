import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { adminCategoryRoutes } from '../modules/categories/categories.routes';

export const adminRoutes = Router();

// Kiểm tra quyền 1 lần cho mọi API /admin/...
adminRoutes.use(requireAuth, requireRole('ADMIN'));

adminRoutes.use('/categories', adminCategoryRoutes);
