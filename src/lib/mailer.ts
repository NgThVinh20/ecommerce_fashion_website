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

/** true nếu đã cấu hình SMTP (email được gửi thật). */
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
