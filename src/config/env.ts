
// Đọc và kiểm tra biến môi trường từ file .env.

import 'dotenv/config'; 
import { z } from 'zod';

// Khai báo các biến bắt buộc và kiểu dữ liệu 
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),            // .env luôn là chuỗi, coerce đổi sang số
  DATABASE_URL: z.string().min(1),                    // Chuỗi kết nối PostgreSQL
  REDIS_URL: z.string().min(1),                       // Chuỗi kết nối Redis
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
  JWT_EXPIRES_IN: z.string().default('15m'),         
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Biến môi trường không hợp lệ:');
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
