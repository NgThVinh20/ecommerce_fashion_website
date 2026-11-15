// Dữ liệu tạo / sửa sản phẩm gửi dạng multipart/form-data (kèm file ảnh).
// Form-data chỉ có chuỗi, nên: số gửi dạng chuỗi (server tự đổi), dữ liệu lồng nhau (skus, attributes, keep_images) gửi dạng chuỗi JSON.
import { z } from 'zod';

const MAX_SKUS = 100;
const MAX_ATTRIBUTES = 20;

// Trường gửi dạng chuỗi JSON: '[{"size":"M"}]' -> [{ size: 'M' }]. Chuỗi sai JSON để nguyên cho Zod báo lỗi.
function jsonField<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }, schema);
}

// "true" / "false" trong form-data -> boolean
const formBoolean = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

// ---------------- SKU ----------------
const skuFields = {
  sku_code: z.string().trim().min(1).max(50),
  size: z.string().trim().min(1).max(20),
  color: z.string().trim().min(1).max(50),
  price: z.coerce.number().int('Giá phải là số nguyên (đồng)').positive().max(1_000_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
};

// Thêm biến thể: form-data, ảnh riêng (không bắt buộc) ở trường file "image"
export const createSkuSchema = z.object(skuFields);

// Sửa biến thể: size và màu là "danh tính" của biến thể nên không cho sửa;
// muốn đổi thì ngừng bán và thêm biến thể mới. Ảnh mới gửi ở trường file "image".
export const updateSkuSchema = z
  .object({
    sku_code: skuFields.sku_code,
    price: skuFields.price,
    stock: skuFields.stock,
    is_active: formBoolean,
    remove_image: formBoolean, // true = bỏ ảnh riêng của biến thể
  })
  .partial();

// ---------------- Sản phẩm ----------------
const productFields = {
  product_name: z.string().trim().min(2).max(200),
  id_category: z.coerce.number().int().positive(),
  description: z.string().trim().max(5000).optional(),
  // '{"Chất liệu":"Cotton","Xuất xứ":"Việt Nam"}'
  attributes: jsonField(
    z
      .record(z.string().trim().min(1).max(50), z.string().trim().min(1).max(200))
      .refine((a) => Object.keys(a).length <= MAX_ATTRIBUTES, `Tối đa ${MAX_ATTRIBUTES} thuộc tính`),
  ).optional(),
};

// Tạo sản phẩm: các trường trên + skus (chuỗi JSON) + file ảnh ở trường "images" (1–9 ảnh)
export const createProductSchema = z
  .object({
    ...productFields,
    skus: jsonField(z.array(createSkuSchema).min(1, 'Cần ít nhất 1 biến thể').max(MAX_SKUS)),
  })
  .superRefine((d, ctx) => {
    // Không trùng (size, màu) và không trùng mã SKU trong cùng một lần gửi
    const variants = new Set<string>();
    const codes = new Set<string>();
    d.skus.forEach((s, i) => {
      const key = `${s.size.toLowerCase()}|${s.color.toLowerCase()}`;
      if (variants.has(key)) {
        ctx.addIssue({ code: 'custom', path: ['skus', i], message: 'Trùng size và màu với biến thể khác' });
      }
      if (codes.has(s.sku_code)) {
        ctx.addIssue({ code: 'custom', path: ['skus', i, 'sku_code'], message: 'Trùng mã SKU' });
      }
      variants.add(key);
      codes.add(s.sku_code);
    });
  });

// Sửa sản phẩm: gửi trường nào sửa trường đó.
// Ảnh: keep_images (chuỗi JSON) = các link ảnh cũ muốn giữ, theo thứ tự; file "images" = ảnh mới thêm vào.
export const updateProductSchema = z
  .object({
    ...productFields,
    keep_images: jsonField(z.array(z.string().trim().url())),
  })
  .partial();

// Người bán chỉ được chuyển giữa ACTIVE và HIDDEN (gửi JSON)
export const productStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN']),
});

// Gửi JSON
export const featuredSchema = z.object({
  is_featured: z.boolean(),
  featured_order: z.number().int().min(1).max(100).optional(),
});

// ---------------- Tham số ----------------
export const productIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const skuIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  skuId: z.coerce.number().int().positive(),
});

// GET /seller/products?status=&q=&page=&limit=
export const listOwnProductsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'BANNED']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// GET /admin/products?status=&q=&shop=&page=&limit=
export const adminListProductsQuerySchema = z.object({
  status: z.enum(['ACTIVE', 'HIDDEN', 'BANNED', 'DELETED']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  shop: z.coerce.number().int().positive().optional(), // id_shop
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const banReasonSchema = z.object({
  reason: z.string().trim().min(5, 'Lý do tối thiểu 5 ký tự').max(500),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateSkuInput = z.infer<typeof createSkuSchema>;
export type UpdateSkuInput = z.infer<typeof updateSkuSchema>;
export type FeaturedInput = z.infer<typeof featuredSchema>;
export type ListOwnProductsQuery = z.infer<typeof listOwnProductsQuerySchema>;
export type AdminListProductsQuery = z.infer<typeof adminListProductsQuerySchema>;
