// Xác thực email bằng mã OTP (phần lõi sinh / kiểm tra mã nằm ở lib/otp.ts).
import { prisma } from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import { consumeOtp, issueOtp } from '../../lib/otp';
import { AppError } from '../../middlewares/errorHandler';

interface OtpReceiver {
  id_user: number;
  email: string;
  fullname: string;
}

// Sinh mã mới và gửi tới email
export async function issueEmailOtp(user: OtpReceiver) {
  return issueOtp('email', user.id_user, (otp) =>
    sendMail({
      to: user.email,
      subject: 'Mã xác thực email',
      text: `Mã xác thực của bạn là ${otp}. Mã có hiệu lực trong 5 phút.`,
      html: `<p>Xin chào ${user.fullname},</p>
             <p>Mã xác thực email của bạn là: <b style="font-size:20px;letter-spacing:4px">${otp}</b></p>
             <p>Mã có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>`,
    }),
  );
}

// Gửi lại mã. Luôn trả cùng một thông báo để không lộ email nào đã đăng ký.
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

// Kiểm tra mã; đúng thì đánh dấu email đã xác thực. Không trả token: người dùng tự đăng nhập.
export async function verifyEmailOtp(email: string, otp: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id_user: true, email_verified: true },
  });
  // Email không tồn tại: báo giống mã hết hạn để không lộ thông tin
  if (!user) throw new AppError(422, 'OTP_EXPIRED', 'Mã xác thực đã hết hạn hoặc chưa được gửi');
  if (user.email_verified) throw new AppError(422, 'EMAIL_ALREADY_VERIFIED', 'Email đã được xác thực');

  await consumeOtp('email', user.id_user, otp);

  await prisma.user.update({ where: { id_user: user.id_user }, data: { email_verified: true } });
  return { email_verified: true };
}
