import { z } from 'zod';

const shopFields = {
  shop_name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().min(5).max(255),
  phone_number: z.string().trim().regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
};

export const registerShopSchema = z.object(shopFields);

export const updateShopSchema = z
  .object(shopFields)
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Cần ít nhất một trường để cập nhật');

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(120),
});

export type RegisterShopInput = z.infer<typeof registerShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;