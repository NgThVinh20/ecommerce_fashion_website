import type { Request, Response } from 'express';

import * as categoryService from './categories.service';
import { createCategorySchema, idParamSchema, updateCategorySchema } from './categories.schema';

export async function getTree(_req: Request, res: Response) {
  res.json({ data: await categoryService.getTree() });
}

export async function create(req: Request, res: Response) {
  const input = createCategorySchema.parse(req.body);
  res.status(201).json({ data: await categoryService.create(input) });
}

export async function update(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  const input = updateCategorySchema.parse(req.body);
  res.json({ data: await categoryService.update(id, input) });
}

export async function remove(req: Request, res: Response) {
  const { id } = idParamSchema.parse(req.params);
  await categoryService.remove(id);
  res.status(204).end();
}
