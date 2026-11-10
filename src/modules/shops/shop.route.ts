import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth';
import * as shopController from './shops.controller';
import * as adminShopController from './admin-shops.controller';

export const shopRoutes = Router();
shopRoutes.post('/', requireAuth, requireRole('CUSTOMER'), shopController.register);
shopRoutes.get('/info', requireAuth, shopController.getInfo); 
shopRoutes.patch('/info', requireAuth, requireRole('CUSTOMER'), shopController.updateApplication);
shopRoutes.get('/:slug', shopController.getBySlug);

// seller 
export const sellerShopRoutes = Router();
sellerShopRoutes.get('/', shopController.getSellerShop);
sellerShopRoutes.patch('/', shopController.updateSellerShop);
sellerShopRoutes.post('/bank/otp', shopController.sendBankOtp);
sellerShopRoutes.patch('/bank', shopController.updateBank);

// admin (đã qua requireAuth + ADMIN ở admin.routes.ts)
export const adminShopRoutes = Router();
adminShopRoutes.get('/', adminShopController.list);
adminShopRoutes.get('/:id', adminShopController.getDetail);
adminShopRoutes.patch('/:id/approve', adminShopController.approve);
adminShopRoutes.patch('/:id/reject', adminShopController.reject);
adminShopRoutes.patch('/:id/lock', adminShopController.lock);
adminShopRoutes.patch('/:id/unlock', adminShopController.unlock);
