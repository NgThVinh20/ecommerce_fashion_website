import { z } from 'zod';

const name = z.string().trim().min(1).max(100);

const rate = z.number().min(0).max(100);

export const createCategorySchema = z.object({
  category_name: name,
  id_categories_parent: z.number().int().positive().optional(),
  commission_rate: rate.optional(),
});

export const updateCategorySchema = z.object({
  category_name: name.optional(),
  commission_rate: rate.optional(),
}).refine((data) => Object.keys(data).length > 0, 'Cần ít nhất một trường để cập nhật');

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
