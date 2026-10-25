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

  
  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      fullname: 'Quản trị viên',
      email,
      hash_password: await bcrypt.hash(password, 10),
      role: 'ADMIN',
    },
  });
  console.log(`Đã có tài khoản admin: ${email}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());