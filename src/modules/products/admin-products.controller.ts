import type { Request, Response } from 'express';
import { adminListProductsQuerySchema, banReasonSchema, productIdParamSchema } from './products.schema';
import * as adminProductService from './admin-products.service';

export async function list(req: Request, res: Response) {
  const query = adminListProductsQuerySchema.parse(req.query);
  const { items, meta } = await adminProductService.list(query);
  res.json({ data: items, meta });
}

export async function getDetail(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  res.json({ data: await adminProductService.getDetail(id) });
}

export async function ban(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const { reason } = banReasonSchema.parse(req.body);
  res.json({ data: await adminProductService.ban(id, reason) });
}

export async function unban(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  res.json({ data: await adminProductService.unban(id) });
}
