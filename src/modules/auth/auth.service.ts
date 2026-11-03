import bcrypt from 'bcrypt';
import crypto from 'crypto';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { env } from '../../config/env';
import { signAccessToken } from '../../lib/jwt';
import { AppError } from '../../middlewares/errorHandler';
import type { LoginInput, RegisterInput } from './auth.schema';
import { issueEmailOtp } from './otp.service';

const publicUser = {
  id_user: true, fullname: true, email: true, email_verified: true, phone_number: true,
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
  if (existed?.email_verified) throw new AppError(409, 'EMAIL_EXISTS', 'Email đã được sử dụng');

  const hash_password = await bcrypt.hash(input.password, 10);
  const data = { fullname: input.fullname, phone_number: input.phone_number, hash_password };

  // Email đã đăng ký nhưng chưa xác thực: ghi đè thông tin (tài khoản đó chưa đăng nhập được,
  // nên không ai giữ được email của người khác bằng cách đăng ký trước)
  const user = existed
    ? await prisma.user.update({ where: { id_user: existed.id_user }, data, select: publicUser })
    : await prisma.user.create({ data: { ...data, email: input.email }, select: publicUser });

  // Gửi mã xác thực ngay sau khi đăng ký
  const otp = await issueEmailOtp(user);
  const { sent, ...info } = otp;
  return {
    user,
    verification: sent
      ? { message: 'Đã gửi mã xác thực tới email', ...info }
      : { message: `Mã vừa được gửi gần đây, vui lòng đợi ${otp.retry_after} giây rồi gửi lại`, ...info },
  };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const res = user && (await bcrypt.compare(input.password, user.hash_password));
  if (!user || !res) throw new AppError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng');
  if (user.status === 'LOCKED') throw new AppError(403, 'ACCOUNT_LOCKED', 'Tài khoản đã bị khóa');
  // Kiểm tra sau khi mật khẩu đúng, để người lạ không dò được email nào chưa xác thực
  if (!user.email_verified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Vui lòng xác thực email trước khi đăng nhập');
  }

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