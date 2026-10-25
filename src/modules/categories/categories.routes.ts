import { Router } from 'express';
import * as categoryController from './categories.controller';

// clients, shops
export const categoryRoutes = Router();
categoryRoutes.get('/', categoryController.getTree);

//admin
export const adminCategoryRoutes = Router();
adminCategoryRoutes.post('/', categoryController.create);
adminCategoryRoutes.patch('/:id', categoryController.update);
adminCategoryRoutes.delete('/:id', categoryController.remove);
