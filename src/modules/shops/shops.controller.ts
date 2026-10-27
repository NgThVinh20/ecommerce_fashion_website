import type { Request, Response } from 'express';
import { registerShopSchema, slugParamSchema, updateShopSchema } from './shops.schema';
import * as shopService from './shops.service';

export async function register(req: Request, res: Response) {
  const input = registerShopSchema.parse(req.body);
  res.status(201).json({ data: await shopService.register(req.user!.sub, input) });
}

export async function getInfo(req: Request, res: Response) {
  res.json({ data: await shopService.getInfo(req.user!.sub) });
}

export async function getBySlug(req: Request, res: Response) {
  const { slug } = slugParamSchema.parse(req.params);
  res.json({ data: await shopService.getBySlug(slug) });
}

export async function getSellerShop(req: Request, res: Response) {
  res.json({ data: req.shop });
}

export async function updateSellerShop(req: Request, res: Response) {
  const input = updateShopSchema.parse(req.body);
  res.json({ data: await shopService.update(req.shop!.id_shop, input) });
}