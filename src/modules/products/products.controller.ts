import type { Request, Response } from 'express';
import {
  createProductSchema, createSkuSchema, featuredSchema, listOwnProductsQuerySchema, productIdParamSchema,
  productStatusSchema, skuIdParamSchema, updateProductSchema, updateSkuSchema,
} from './products.schema';
import * as productService from './products.service';

// File ảnh multer đã nhận (uploadImages.array('images', ...))
const filesOf = (req: Request) => (req.files as Express.Multer.File[] | undefined) ?? [];

export async function create(req: Request, res: Response) {
  const input = createProductSchema.parse(req.body);
  res.status(201).json({ data: await productService.create(req.shop!, input, filesOf(req)) });
}

export async function listOwn(req: Request, res: Response) {
  const query = listOwnProductsQuerySchema.parse(req.query);
  const { items, meta } = await productService.listOwn(req.shop!, query);
  res.json({ data: items, meta });
}

export async function getDetailProduct(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  res.json({ data: await productService.getDetailProduct(req.shop!, id) });
}

export async function update(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const input = updateProductSchema.parse(req.body);
  res.json({ data: await productService.update(req.shop!, id, input, filesOf(req)) });
}

export async function setStatus(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const { status } = productStatusSchema.parse(req.body);
  res.json({ data: await productService.setStatus(req.shop!, id, status) });
}

export async function remove(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  await productService.remove(req.shop!, id);
  res.status(204).end();
}

export async function setFeatured(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const input = featuredSchema.parse(req.body);
  res.json({ data: await productService.setFeatured(req.shop!, id, input) });
}

export async function addSku(req: Request, res: Response) {
  const { id } = productIdParamSchema.parse(req.params);
  const input = createSkuSchema.parse(req.body);
  res.status(201).json({ data: await productService.addSku(req.shop!, id, input, req.file) });
}

export async function updateSku(req: Request, res: Response) {
  const { id, skuId } = skuIdParamSchema.parse(req.params);
  const input = updateSkuSchema.parse(req.body);
  res.json({ data: await productService.updateSku(req.shop!, id, skuId, input, req.file) });
}
