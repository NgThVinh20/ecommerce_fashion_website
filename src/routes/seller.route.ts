import { Router } from 'express';
import { requireAuth, requireRole } from '../middlewares/auth';
import { requireActiveShop } from '../middlewares/activeShop';
import { sellerShopRoutes } from '../modules/shops/shop.route';
import { sellerProductRoutes } from '../modules/products/products.routes';

export const sellerRoutes = Router();

sellerRoutes.use(requireAuth, requireRole('SELLER'), requireActiveShop);

sellerRoutes.use('/shop', sellerShopRoutes);
sellerRoutes.use('/products', sellerProductRoutes);
