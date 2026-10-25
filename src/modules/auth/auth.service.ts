import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { env } from '../../config/env';
import { signAccessToken } from '../../lib/jwt';
import { AppError } from '../../middlewares/errorHandler';
import type { LoginInput, RegisterInput } from './auth.schema';

const publicUser = {
  id_user: true, fullname: true, email: true, phone_number: true,
  role: true, status: true, created_at: true,
} as const;

// Redis chỉ lưu mã băm của refresh token, không lưu chuỗi gốc
const rtKey = (token: string) => `rt:${crypto.createHash('sha256').update(token).digest('hex')}`;

//tạo một cặp Access Token và Refresh Token mới,
async function issueTokens(id_user: number, role: UserRole) {
  const accessToken = signAccessToken({ sub: id_user, role });
  const refreshToken = crypto.randomBytes(32).toString('hex');
  await redis.set(rtKey(refreshToken), String(id_user), 'EX', env.REFRESH_TOKEN_TTL_DAYS * 86400);
  return { accessToken, refreshToken };
}

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

  return issueTokens(user.id_user, user.role);
}

export async function getMe(id_user: number) {
  const user = await prisma.user.findUnique({ where: { id_user }, select: publicUser });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  return user;
}

export async function refresh(refreshToken: string) {
  const id = await redis.getdel(rtKey(refreshToken));
  if (!id) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');

  const user = await prisma.user.findUnique({ where: { id_user: Number(id) } });
  if (!user || user.status === 'LOCKED') {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
  }
  return issueTokens(user.id_user, user.role);
}

export async function logout(refreshToken: string) {
  await redis.del(rtKey(refreshToken));
}