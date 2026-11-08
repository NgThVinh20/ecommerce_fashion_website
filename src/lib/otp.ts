// Mã OTP 6 số dùng chung cho nhiều mục đích (xác thực email, đổi tài khoản ngân hàng...).
// Mỗi mục đích có bộ key Redis riêng, mã của mục đích này không dùng được cho mục đích khác.
import crypto from 'crypto';
import { redis } from './redis';
import { AppError } from '../middlewares/errorHandler';

export type OtpPurpose = 'email' | 'bank';

export const OTP_TTL_SECONDS = 5 * 60;   // mã có hiệu lực 5 phút
const RESEND_COOLDOWN_SECONDS = 60;       // mỗi phút chỉ được gửi 1 lần
const MAX_ATTEMPTS = 5;                   // sai quá 5 lần thì hủy mã

const keys = (purpose: OtpPurpose, id_user: number) => ({
  otp: `otp:${purpose}:${id_user}`,           // mã băm của OTP
  cooldown: `otp:${purpose}:cd:${id_user}`,   // chặn gửi lại liên tục
  attempts: `otp:${purpose}:att:${id_user}`,  // đếm số lần nhập sai
});

// Chỉ lưu mã băm, không lưu mã gốc (giống refresh token)
const hashOtp = (otp: string) => crypto.createHash('sha256').update(otp).digest('hex');

// sinh mã mới, lưu trên redis, gửi về email. Nếu gửi thất bại thì xóa mã và cho phép gửi lại ngay.
export async function issueOtp(purpose: OtpPurpose, id_user: number, deliver: (otp: string) => Promise<void>) {
  const k = keys(purpose, id_user);

  // SET ... NX: chỉ đặt được khi key chưa tồn tại, tức đã qua 60 giây kể từ lần gửi trước
  const allowed = await redis.set(k.cooldown, '1', 'EX', RESEND_COOLDOWN_SECONDS, 'NX');
  if (!allowed) {
    return { sent: false as const, retry_after: await redis.ttl(k.cooldown) };
  }

  // Sinh mã 6 số ngẫu nhiên an toàn
  const otp = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

  // Lưu mã mới và xóa bộ đếm sai của mã cũ
  await redis.multi().set(k.otp, hashOtp(otp), 'EX', OTP_TTL_SECONDS).del(k.attempts).exec();

  try {
    await deliver(otp);
  } catch (err) {
    // Gửi thất bại: xóa mã và cho phép gửi lại ngay
    await redis.del(k.otp, k.cooldown);
    throw err;
  }

  return { sent: true as const, expires_in: OTP_TTL_SECONDS };
}

/**
 * Kiểm tra mã. Sai thì ném lỗi đúng thì xóa mã để không dùng lại được.
 */
export async function consumeOtp(purpose: OtpPurpose, id_user: number, otp: string) {
  const k = keys(purpose, id_user);

  const stored = await redis.get(k.otp);
  if (!stored) throw new AppError(422, 'OTP_EXPIRED', 'Mã xác thực đã hết hạn hoặc chưa được gửi');

  // Tăng bộ đếm trước khi so sánh (INCR là thao tác nguyên tử)
  const attempts = await redis.incr(k.attempts);
  if (attempts === 1) await redis.expire(k.attempts, OTP_TTL_SECONDS);

  // So sánh thời gian cố định, tránh đoán mã qua thời gian phản hồi
  const matched = crypto.timingSafeEqual(Buffer.from(hashOtp(otp), 'hex'), Buffer.from(stored, 'hex'));

  if (!matched) {
    if (attempts >= MAX_ATTEMPTS) {
      await redis.del(k.otp, k.attempts);
      throw new AppError(429, 'OTP_TOO_MANY_ATTEMPTS', 'Nhập sai quá nhiều lần, vui lòng gửi lại mã mới');
    }
    throw new AppError(422, 'OTP_INVALID', `Mã xác thực không đúng, còn ${MAX_ATTEMPTS - attempts} lần thử`);
  }

  await redis.del(k.otp, k.attempts, k.cooldown);
}
