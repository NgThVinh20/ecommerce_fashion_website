
// Đọc và kiểm tra biến môi trường từ file .env.

import 'dotenv/config'; 
import { z } from 'zod';

// Khai báo các biến bắt buộc và kiểu dữ liệu 
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),           
  DATABASE_URL: z.string().min(1),                    
  REDIS_URL: z.string().min(1),                       
  JWT_SECRET: z.string().min(32, 'JWT_SECRET phải dài ít nhất 32 ký tự'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),         
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
