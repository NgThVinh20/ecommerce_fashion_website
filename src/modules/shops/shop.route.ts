import { Router } from 'express';
import { requireAuth, requireRole } from '../../middlewares/auth';
import * as shopController from './shops.controller';

export const shopRoutes = Router();
shopRoutes.post('/', requireAuth, requireRole('CUSTOMER'), shopController.register);
shopRoutes.get('/info', requireAuth, shopController.getInfo); 
shopRoutes.get('/:slug', shopController.getBySlug);

// seller 
export const sellerShopRoutes = Router();
sellerShopRoutes.get('/', shopController.getSellerShop);
sellerShopRoutes.patch('/', shopController.updateSellerShop);
sellerShopRoutes.post('/bank/otp', shopController.sendBankOtp);
sellerShopRoutes.patch('/bank', shopController.updateBank);  