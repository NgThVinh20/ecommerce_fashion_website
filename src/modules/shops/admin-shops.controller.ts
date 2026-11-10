import type { Request, Response } from 'express';
import { listShopsQuerySchema, reasonSchema, shopIdParamSchema } from './shops.schema';
import * as adminShopService from './admin-shops.service';

export async function list(req: Request, res: Response) {
  const query = listShopsQuerySchema.parse(req.query);
  const { items, meta } = await adminShopService.list(query);
  res.json({ data: items, meta });
}

export async function getDetail(req: Request, res: Response) {
  const { id } = shopIdParamSchema.parse(req.params);
  res.json({ data: await adminShopService.getDetail(id) });
}

export async function approve(req: Request, res: Response) {
  const { id } = shopIdParamSchema.parse(req.params);
  res.json({ data: await adminShopService.approve(id) });
}

export async function reject(req: Request, res: Response) {
  const { id } = shopIdParamSchema.parse(req.params);
  const { reason } = reasonSchema.parse(req.body);
  res.json({ data: await adminShopService.reject(id, reason) });
}

export async function lock(req: Request, res: Response) {
  const { id } = shopIdParamSchema.parse(req.params);
  const { reason } = reasonSchema.parse(req.body);
  res.json({ data: await adminShopService.lock(id, reason) });
}

export async function unlock(req: Request, res: Response) {
  const { id } = shopIdParamSchema.parse(req.params);
  res.json({ data: await adminShopService.unlock(id) });
}
