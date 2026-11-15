import { Router } from 'express';
import { MAX_IMAGES, uploadImages } from '../../middlewares/upload';
import * as productController from './products.controller';
import * as adminProductController from './admin-products.controller';

// seller (đã qua requireAuth + SELLER + requireActiveShop ở seller.route.ts)
export const sellerProductRoutes = Router();
sellerProductRoutes.post('/', uploadImages.array('images', MAX_IMAGES), productController.create);
sellerProductRoutes.get('/', productController.listOwn);
sellerProductRoutes.get('/:id', productController.getDetailProduct);
sellerProductRoutes.patch('/:id', uploadImages.array('images', MAX_IMAGES), productController.update);
sellerProductRoutes.patch('/:id/status', productController.setStatus);
sellerProductRoutes.patch('/:id/featured', productController.setFeatured);
sellerProductRoutes.delete('/:id', productController.remove);
sellerProductRoutes.post('/:id/skus', uploadImages.single('image'), productController.addSku);
sellerProductRoutes.patch('/:id/skus/:skuId', uploadImages.single('image'), productController.updateSku);

// admin (đã qua requireAuth + ADMIN ở admin.routes.ts)
export const adminProductRoutes = Router();
adminProductRoutes.get('/', adminProductController.list);
adminProductRoutes.get('/:id', adminProductController.getDetail);
adminProductRoutes.patch('/:id/ban', adminProductController.ban);
adminProductRoutes.patch('/:id/unban', adminProductController.unban);
