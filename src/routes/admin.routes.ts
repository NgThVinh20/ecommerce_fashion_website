import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { adminCategoryRoutes } from '../modules/categories/categories.routes';
import { adminShopRoutes } from '../modules/shops/shop.route';

export const adminRoutes = Router();

// Kiểm tra quyền 1 lần cho mọi API /admin/...
adminRoutes.use(requireAuth, requireRole('ADMIN'));

adminRoutes.use('/categories', adminCategoryRoutes);
adminRoutes.use('/shops', adminShopRoutes);
