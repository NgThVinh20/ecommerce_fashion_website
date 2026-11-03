// Xác thực email bằng mã OTP 6 số lưu trên Redis.
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { env } from '../../config/env';
import { isMailConfigured, sendMail } from '../../lib/mailer';
import { AppError } from '../../middlewares/errorHandler';

export const OTP_TTL_SECONDS = 5 * 60;    // mã có hiệu lực 5 phút
const RESEND_COOLDOWN_SECONDS = 60;        // mỗi phút chỉ được gửi 1 lần
const MAX_ATTEMPTS = 5;                    // sai quá 5 lần thì hủy mã

// Các key Redis của một người dùng
const keys = (id_user: number) => ({
  otp: `otp:${id_user}`,          // mã băm của OTP
  cooldown: `otp:cd:${id_user}`,  // chặn gửi lại liên tục
  attempts: `otp:att:${id_user}`, // đếm số lần nhập sai
});


const hashOtp = (otp: string) => crypto.createHash('sha256').update(otp).digest('hex');

interface OtpReceiver {
  id_user: number;
  email: string;
  fullname: string;
}


 //Sinh mã mới và gửi tới email.
 
export async function issueEmailOtp(user: OtpReceiver) {
  const k = keys(user.id_user);

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
    await sendMail({
      to: user.email,
      subject: 'Mã xác thực email',
      text: `Mã xác thực của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
      html: `<p>Xin chào ${user.fullname},</p>
             <p>Mã xác thực email của bạn là: <b style="font-size:20px;letter-spacing:4px">${otp}</b></p>
             <p>Mã có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>`,
    });
  } catch (err) {
    // Gửi thất bại: xóa mã và cho phép gửi lại ngay
    await redis.del(k.otp, k.cooldown);
    throw err;
  }

  return {
    sent: true as const,
    expires_in: OTP_TTL_SECONDS
  };
}

//gửi lại mã
export async function resendEmailOtp(email: string) {
  const message = 'Nếu email đã đăng ký và chưa xác thực, mã xác thực đã được gửi';

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id_user: true, email: true, fullname: true, email_verified: true },
  });
  if (!user || user.email_verified) return { message };

  const result = await issueEmailOtp(user);
  if (!result.sent) {
    throw new AppError(429, 'OTP_TOO_FREQUENT', `Vui lòng đợi ${result.retry_after} giây trước khi gửi lại mã`);
  }
  const { sent, ...info } = result;
  return { message, ...info };
}

/** Kiểm tra mã; đúng thì đánh dấu email đã xác thực. Không trả token: người dùng tự đăng nhập. */
export async function verifyEmailOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id_user: true, email_verified: true },
  });
  // Email không tồn tại: báo giống mã hết hạn để không lộ thông tin
  if (!user) throw new AppError(422, 'OTP_EXPIRED', 'Mã xác thực đã hết hạn hoặc chưa được gửi');
  if (user.email_verified) throw new AppError(422, 'EMAIL_ALREADY_VERIFIED', 'Email đã được xác thực');

  const k = keys(user.id_user);
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

  await prisma.user.update({ where: { id_user: user.id_user }, data: { email_verified: true } });
  await redis.del(k.otp, k.attempts, k.cooldown);
  return { email_verified: true };
}
