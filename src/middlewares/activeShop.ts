import type { NextFunction, Request, Response } from 'express';
import type { Shop } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      shop?: Shop;
    }
  }
}


export async function requireActiveShop(req: Request, _res: Response, next: NextFunction) {
  const shop = await prisma.shop.findUnique({ where: { id_user: req.user!.sub } });
  if (!shop) throw new AppError(403, 'SHOP_REQUIRED', 'Bạn chưa có gian hàng');
  if (shop.status !== 'ACTIVE') {
    throw new AppError(403, 'SHOP_NOT_ACTIVE', 'Gian hàng chưa được duyệt hoặc đã bị khóa');
  }
  req.shop = shop;
  next();
}