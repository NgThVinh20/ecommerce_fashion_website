import { z } from 'zod';


const toBankName = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toUpperCase();


const shopInfo = {
  shop_name: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional(),
  address: z.string().trim().min(5).max(255),
  phone_number: z.string().trim().regex(/^0\d{9,10}$/, 'Số điện thoại không hợp lệ'),
};

const bankInfo= {
  bank_name: z.string().trim().min(2).max(100),
  bank_account_number: z.string().trim().regex(/^\d{6,20}$/, 'Số tài khoản gồm 6–20 chữ số'),
  bank_account_name: z.string().trim().min(2).max(100).transform(toBankName),
};

 //thông tin cơ bản + tên shop + mã số thuế + ngân hàng 
export const registerShopSchema = z.object({
  ...shopInfo,
  tax_code: z.string().trim().regex(/^\d{10}(-\d{3})?$/, 'Mã số thuế gồm 10 số, hoặc 10 số kèm -3 số mã chi nhánh'),
  ...bankInfo,
})

// Sau khi duyệt: chỉ sửa mô tả, địa chỉ, số điện thoại (tên shop, mã số thuế phải liên hệ admin)
export const updateShopSchema = z
  .object(shopInfo)
  .partial()
  .refine((d) => Object.keys(d).length > 0, 'Cần ít nhất một trường để cập nhật');

// Đổi tài khoản ngân hàng: phải nhập lại mật khẩu và mã OTP gửi về email
export const updateBankSchema = z.object({
  password: z.string().min(1),
  otp: z.string().trim().regex(/^\d{6}$/, 'Mã OTP gồm 6 chữ số'),
  ...bankInfo,
});

export const slugParamSchema = z.object({
  slug: z.string().min(1).max(120),
});

export type RegisterShopInput = z.infer<typeof registerShopSchema>;
export type UpdateShopInput = z.infer<typeof updateShopSchema>;
export type UpdateBankInput = z.infer<typeof updateBankSchema>;