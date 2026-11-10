// Admin quản lý shop: danh sách, xem hồ sơ, duyệt, từ chối, khóa, mở khóa.
import type { Prisma, ShopStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { sendMail } from '../../lib/mailer';
import { AppError } from '../../middlewares/errorHandler';
import type { ListShopsQuery } from './shops.schema';

const ownerSelect = { id_user: true, fullname: true, email: true, phone_number: true } as const;

export async function list(query: ListShopsQuery) {
  const { status, q, page, limit } = query;
  const where: Prisma.ShopWhereInput = {
    ...(status && { status }),
    ...(q && {
      OR: [
        { shop_name: { contains: q, mode: 'insensitive' } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };

  // Đếm và lấy danh sách trong cùng một lần đọc
  const [items, total] = await prisma.$transaction([
    prisma.shop.findMany({
      where,
      // Shop chờ duyệt: cũ nhất lên đầu (duyệt theo thứ tự đăng ký); còn lại: mới nhất lên đầu
      orderBy: { created_at: status === 'PENDING' ? 'asc' : 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id_shop: true, shop_name: true, slug: true, status: true, created_at: true,
        user: { select: ownerSelect },
      },
    }),
    prisma.shop.count({ where }),
  ]);

  return { items, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

// Hồ sơ đầy đủ (kể cả mã số thuế, ngân hàng) để admin xét duyệt
export async function getDetail(id_shop: number) {
  const shop = await prisma.shop.findUnique({
    where: { id_shop },
    include: { user: { select: ownerSelect } },
  });
  if (!shop) throw new AppError(404, 'SHOP_NOT_FOUND', 'Không tìm thấy gian hàng');
  return shop;
}

// Chống chèn mã HTML khi đưa lý do (do admin nhập) vào nội dung email
const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Gửi email báo cho chủ shop. Gửi lỗi thì chỉ ghi log, không ảnh hưởng thao tác đã thành công.
function notifyOwner(owner: { email: string; fullname: string }, subject: string, lines: string[]) {
  sendMail({
    to: owner.email,
    subject,
    text: lines.join('\n'),
    html: `<p>Xin chào ${escapeHtml(owner.fullname)},</p>` + lines.map((l) => `<p>${escapeHtml(l)}</p>`).join(''),
  }).catch((err) => console.error(`Không gửi được email "${subject}":`, err));
}

/**
 * Đổi trạng thái có điều kiện: chỉ đổi khi shop đang ở trạng thái `from`.
 * Hai admin thao tác cùng lúc thì chỉ một người thành công, người còn lại nhận 422.
 */
async function transition(
  tx: Prisma.TransactionClient,
  id_shop: number,
  from: ShopStatus,
  data: Prisma.ShopUpdateManyMutationInput,
  error: { code: string; message: string },
) {
  const result = await tx.shop.updateMany({ where: { id_shop, status: from }, data });
  if (result.count === 0) throw new AppError(422, error.code, error.message);
}

export async function approve(id_shop: number) {
  const shop = await getDetail(id_shop);

  // Một transaction: shop ACTIVE và chủ shop thành SELLER, lỗi ở bước nào thì hủy cả hai
  await prisma.$transaction(async (tx) => {
    await transition(tx, id_shop, 'PENDING', { status: 'ACTIVE', reject_reason: null }, {
      code: 'SHOP_NOT_PENDING', message: 'Chỉ duyệt được shop đang chờ duyệt',
    });
    await tx.user.update({ where: { id_user: shop.id_user }, data: { role: 'SELLER' } });
  });

  notifyOwner(shop.user, 'Gian hàng của bạn đã được duyệt', [
    `Gian hàng "${shop.shop_name}" đã được duyệt và bắt đầu hoạt động.`,
    'Vui lòng đăng nhập lại để vào trang quản lý gian hàng.',
  ]);
  return getDetail(id_shop);
}

export async function reject(id_shop: number, reason: string) {
  const shop = await getDetail(id_shop);
  await transition(prisma, id_shop, 'PENDING', { status: 'REJECTED', reject_reason: reason }, {
    code: 'SHOP_NOT_PENDING', message: 'Chỉ từ chối được shop đang chờ duyệt',
  });

  notifyOwner(shop.user, 'Hồ sơ gian hàng chưa được duyệt', [
    `Hồ sơ gian hàng "${shop.shop_name}" chưa được duyệt.`,
    `Lý do: ${reason}`,
    'Bạn có thể sửa hồ sơ và gửi lại để được xét duyệt.',
  ]);
  return getDetail(id_shop);
}

export async function lock(id_shop: number, reason: string) {
  const shop = await getDetail(id_shop);
  await transition(prisma, id_shop, 'ACTIVE', { status: 'LOCKED', lock_reason: reason }, {
    code: 'SHOP_NOT_ACTIVE', message: 'Chỉ khóa được shop đang hoạt động',
  });

  notifyOwner(shop.user, 'Gian hàng của bạn đã bị tạm khóa', [
    `Gian hàng "${shop.shop_name}" đã bị tạm khóa.`,
    `Lý do: ${reason}`,
    'Vui lòng liên hệ quản trị viên nếu cần hỗ trợ.',
  ]);
  return getDetail(id_shop);
}

export async function unlock(id_shop: number) {
  const shop = await getDetail(id_shop);
  await transition(prisma, id_shop, 'LOCKED', { status: 'ACTIVE', lock_reason: null }, {
    code: 'SHOP_NOT_LOCKED', message: 'Chỉ mở khóa được shop đang bị khóa',
  });

  notifyOwner(shop.user, 'Gian hàng của bạn đã được mở khóa', [
    `Gian hàng "${shop.shop_name}" đã được mở khóa và hoạt động trở lại.`,
  ]);
  return getDetail(id_shop);
}
