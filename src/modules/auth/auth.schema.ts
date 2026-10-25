import { z } from 'zod';

export const registerSchema = z.object({
  fullname: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72), 
  phone_number: z.string().trim().max(15).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// tự động tạo kiểu tương ứng
export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;