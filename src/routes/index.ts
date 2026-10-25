import { Router } from 'express';
import { authRoutes } from '../modules/auth/auth.routes';
import { categoryRoutes } from '../modules/categories/categories.routes';
import { adminRoutes } from './admin.routes';

export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/categories', categoryRoutes);
apiRoutes.use('/admin', adminRoutes);
