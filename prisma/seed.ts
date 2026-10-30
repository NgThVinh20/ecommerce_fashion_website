import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 8) {
    throw new Error('Thiếu ADMIN_EMAIL hoặc ADMIN_PASSWORD (tối thiểu 8 ký tự) trong .env');
  }

  
  const hash_password = await bcrypt.hash(password, 10);
  await prisma.user.upsert({
    where: { email },
    // Đã có: cập nhật mật khẩu theo .env và đảm bảo là admin đã xác thực email
    update: { hash_password, role: 'ADMIN', email_verified: true },
    // Chưa có: tạo mới
    create: {
      fullname: 'Quản trị viên',
      email,
      hash_password,
      role: 'ADMIN',
      email_verified: true,
    },
  });
  console.log(`Đã có tài khoản admin: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());