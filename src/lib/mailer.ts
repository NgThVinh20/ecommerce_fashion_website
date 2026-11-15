// Gửi email bằng nodemailer qua SMTP (Gmail).
import nodemailer from 'nodemailer';
import { env } from '../config/env';

// Chỉ tạo kết nối SMTP khi đã khai báo tài khoản trong .env
const transporter =
  env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465, // cổng 465 dùng SSL, cổng 587 dùng STARTTLS
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

/** true nếu đã cấu hình SMTP  */
export const isMailConfigured = transporter !== null;

interface MailOptions {
  to: string;
  subject: string;
  text: string;  // nội dung dạng chữ thường
  html: string;  // nội dung dạng HTML
}

export async function sendMail({ to, subject, text, html }: MailOptions) {
  if (!transporter) {
    // Máy chủ thật bắt buộc phải gửi được email
    if (env.NODE_ENV === 'production') throw new Error('Chưa cấu hình SMTP_USER / SMTP_PASS');

    // Khi phát triển: in ra terminal thay vì gửi
    console.log(`[mail] (chưa cấu hình SMTP, không gửi thật)\n  Tới: ${to}\n  Tiêu đề: ${subject}\n  ${text}`);
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM ?? env.SMTP_USER, to, subject, text, html });
}

// Chống chèn mã HTML khi đưa nội dung do người dùng nhập (tên, lý do...) vào email
export const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Gửi email thông báo dạng nhiều dòng. Gửi lỗi thì chỉ ghi log,
 * không làm hỏng thao tác chính đã thành công (duyệt shop, cấm sản phẩm...).
 */
export function sendNotice(to: { email: string; fullname: string }, subject: string, lines: string[]) {
  sendMail({
    to: to.email,
    subject,
    text: lines.join('\n'),
    html: `<p>Xin chào ${escapeHtml(to.fullname)},</p>` + lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
  }).catch((err) => console.error(`Không gửi được email "${subject}":`, err));
}

