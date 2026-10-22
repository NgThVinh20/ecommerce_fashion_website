import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma';
import { signAccessToken } from '../../lib/jwt';
import { AppError } from '../../middlewares/errorHandler';
import type { LoginInput, RegisterInput } from './auth.schema';

const publicUser = {
  id_user: true, fullname: true, email: true, phone_number: true,
  role: true, status: true, created_at: true,
} as const;

export async function register(input: RegisterInput) {
  const existed = await prisma.user.findUnique({ where: { email: input.email } });
  if (existed) throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng');

  const hash_password = await bcrypt.hash(input.password, 10);
  return prisma.user.create({
    data: {
      fullname: input.fullname,
      email: input.email,
      phone_number: input.phone_number,
      hash_password,
    },
    select: publicUser,
  });
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const res = user && (await bcrypt.compare(input.password, user.hash_password));
  if (!user || !res) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  if (user.status === 'LOCKED') throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');

  const accessToken = signAccessToken({ sub: user.id_user, role: user.role });
  return { accessToken };
}

export async function getMe(id_user: number) {
  const user = await prisma.user.findUnique({ where: { id_user }, select: publicUser });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  return user;
}
