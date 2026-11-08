import bcrypt from 'bcrypt';
import type { Prisma, Shop } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { slugify } from '../../lib/slug';
import { sendMail } from '../../lib/mailer';
import { consumeOtp, issueOtp } from '../../lib/otp';
import { AppError } from '../../middlewares/errorHandler';
import type { RegisterShopInput, UpdateBankInput, UpdateShopInput } from './shops.schema';

const BANK_UPDATE_INTERVAL_DAYS = 30; 
const SHOP_RENAME_INTERVAL_DAYS = 30; 


function countUpdate(last: Date | null, days: number, code: string, action: string) {
  if (!last) return;
  const next = new Date(last.getTime() + days * 86400_000);
  if (next > new Date()) {
    const nextText = next.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    throw new AppError(422, code, `Mỗi ${days} ngày chỉ được ${action} một lần. Lần tiếp theo từ ${nextText}`);
  }
}

const publicShop = {
  id_shop: true, shop_name: true, slug: true, description: true, created_at: true,
} as const;

// tạo slug duy nhất từ tên shop, nếu trùng thì thêm "-2", "-3", ...
async function generateUniqueSlug(name: string) {
  const base = slugify(name) || 'shop';
  let slug = base;
  let i = 2;
  while (await prisma.shop.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

export async function register(id_user: number, input: RegisterShopInput) {
  const existed = await prisma.shop.findUnique({ where: { id_user } });
  if (existed) throw new AppError(409, 'SHOP_EXISTS', 'Tài khoản đã đăng ký gian hàng');

  const slug = await generateUniqueSlug(input.shop_name);
  return prisma.shop.create({ data: { ...input, id_user, slug } });
}

export async function getInfo(id_user: number) {
  const shop = await prisma.shop.findUnique({ where: { id_user } });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Bạn chưa đăng ký gian hàng');
  return shop;
}

export async function getBySlug(slug: string) {
  const shop = await prisma.shop.findFirst({ where: { slug, status: 'ACTIVE' }, select: publicShop });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Không tìm thấy gian hàng');
  return shop;
}

export async function update(shop: Shop, input: UpdateShopInput) {
  const { shop_name, ...rest } = input;
  const data: Prisma.ShopUpdateInput = rest;

  // bỏ qua tên cũ 
  if (shop_name && shop_name !== shop.shop_name) {
    countUpdate(shop.name_updated_at, SHOP_RENAME_INTERVAL_DAYS, 'SHOP_RENAME_TOO_SOON', 'đổi tên shop');
    const existName = await prisma.shop.findUnique({ where: { shop_name } });
    if (existName) throw new AppError(409, 'SHOP_NAME_EXISTS', 'Tên shop đã được sử dụng');
    data.shop_name = shop_name;
    data.name_updated_at = new Date(); // slug giữ nguyên để link cũ của shop không bị hỏng
  }
  return prisma.shop.update({ where: { id_shop: shop.id_shop }, data });
}

// Đổi tài khoản ngân hàng 

// ẩn số tài khoản ngân hàng
const maskAccount = (n: string) => '*'.repeat(Math.max(n.length - 4, 0)) + n.slice(-4);

// tối đa 1 lần đổi mỗi 30 ngày (lần khai lúc đăng ký shop không tính)
function verifyUpdateBank(shop: Shop) {
  countUpdate(shop.bank_updated_at, BANK_UPDATE_INTERVAL_DAYS, 'BANK_UPDATE_TOO_SOON', 'đổi tài khoản ngân hàng');
  // chưa làm: đang có yêu cầu rút tiền chờ duyệt thì không cho đổi
}

async function findOwner(id_user: number) {
  const user = await prisma.user.findUnique({
    where: { id_user },
    select: { email: true, fullname: true, hash_password: true },
  });
  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Không tìm thấy người dùng');
  return user;
}

// gửi mã OTP về email chủ shop trước khi đổi
export async function sendBankOtp(shop: Shop, id_user: number) {
  verifyUpdateBank(shop);
  const user = await findOwner(id_user);

  const result = await issueOtp('bank', id_user, (otp) =>
    sendMail({
      to: user.email,
      subject: 'Mã xác nhận đổi tài khoản ngân hàng',
      text: `Mã xác nhận đổi tài khoản ngân hàng của shop ${shop.shop_name} là ${otp}. Mã có hiệu lực trong 5 phút.`,
      html: `<p>Xin chào ${user.fullname},</p>
             <p>Mã xác nhận đổi tài khoản ngân hàng nhận tiền của shop <b>${shop.shop_name}</b> là:
             <b style="font-size:20px;letter-spacing:4px">${otp}</b></p>
             <p>Mã có hiệu lực trong 5 phút. Nếu bạn không yêu cầu đổi tài khoản, hãy đổi mật khẩu ngay.</p>`,
    }),
  );
  if (!result.sent) {
    throw new AppError(429, 'OTP_TOO_FREQUENT', `Vui lòng đợi ${result.retry_after} giây trước khi gửi lại mã`);
  }
  const { sent, ...info } = result;
  return { message: 'Đã gửi mã xác nhận tới email', ...info };
}

export async function updateBank(shop: Shop, id_user: number, input: UpdateBankInput) {
  verifyUpdateBank(shop);
  const user = await findOwner(id_user);

  // nhập lại mật khẩu
  if (!(await bcrypt.compare(input.password, user.hash_password))) {
    throw new AppError(422, 'INVALID_PASSWORD', 'Mật khẩu không đúng');
  }

  //  mã OTP đúng 
  await consumeOtp('bank', id_user, input.otp);

  const updated = await prisma.shop.update({
    where: { id_shop: shop.id_shop },
    data: {
      bank_name: input.bank_name,
      bank_account_number: input.bank_account_number,
      bank_account_name: input.bank_account_name,
      bank_updated_at: new Date(), 
    },
  });
  // chưa làm chặn rút tiền trong 24 giờ sau bank_updated_at

  //  báo cho chủ shop. Gửi thư lỗi thì chỉ ghi log, không hủy việc đổi đã thành công.
  sendMail({
    to: user.email,
    subject: 'Tài khoản ngân hàng của shop vừa được thay đổi',
    text: `Tài khoản nhận tiền của shop ${shop.shop_name} đã đổi sang ${input.bank_name} ${maskAccount(input.bank_account_number)}.`,
    html: `<p>Xin chào ${user.fullname},</p>
           <p>Tài khoản ngân hàng nhận tiền của shop <b>${shop.shop_name}</b> vừa được đổi sang:
           <b>${input.bank_name} – ${maskAccount(input.bank_account_number)} – ${input.bank_account_name}</b>.</p>
           <p>Rút tiền sẽ tạm khóa 24 giờ. Nếu không phải bạn thực hiện, hãy đổi mật khẩu và liên hệ quản trị viên ngay.</p>`,
  }).catch((err) => console.error('Không gửi được email thông báo đổi ngân hàng:', err));

  return updated;
}