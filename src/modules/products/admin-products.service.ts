// Admin kiểm duyệt sản phẩm: xem danh sách, chi tiết, cấm và gỡ cấm.
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { toSearchText } from '../../lib/slug';
import { sendNotice } from '../../lib/mailer';
import { AppError } from '../../middlewares/errorHandler';
import type { AdminListProductsQuery } from './products.schema';

const shopSelect = {
  select: { id_shop: true, shop_name: true, slug: true, user: { select: { fullname: true, email: true } } },
} as const;

export async function list(query: AdminListProductsQuery) {
  const { status, q, shop, page, limit } = query;
  const where: Prisma.ProductWhereInput = {
    ...(status && { status }),
    ...(shop && { id_shop: shop }),
    ...(q && { search_name: { contains: toSearchText(q) } }),
  };

  const [items, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id_product: true, product_name: true, images: true, status: true, ban_reason: true,
        min_price: true, max_price: true, created_at: true,
        shop: { select: { id_shop: true, shop_name: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

export async function getDetail(id_product: number) {
  const product = await prisma.product.findUnique({
    where: { id_product },
    include: {
      skus: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
      category: { select: { id_category: true, category_name: true } },
      shop: shopSelect,
    },
  });
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm');
  return product;
}

// Cấm: chỉ áp dụng cho sản phẩm đang bán hoặc đang ẩn; bỏ luôn khỏi khối nổi bật
export async function ban(id_product: number, reason: string) {
  const product = await getDetail(id_product);
  const result = await prisma.product.updateMany({
    where: { id_product, status: { in: ['ACTIVE', 'HIDDEN'] } },
    data: { status: 'BANNED', ban_reason: reason, is_featured: false, featured_order: null },
  });
  if (result.count === 0) {
    throw new AppError(422, 'PRODUCT_NOT_BANNABLE', 'Chỉ cấm được sản phẩm đang bán hoặc đang ẩn');
  }

  sendNotice(product.shop.user, 'Sản phẩm của bạn đã bị gỡ khỏi sàn', [
    `Sản phẩm "${product.product_name}" của gian hàng "${product.shop.shop_name}" đã bị gỡ do vi phạm quy định.`,
    `Lý do: ${reason}`,
    'Bạn có thể sửa lại nội dung sản phẩm và liên hệ quản trị viên để được xem xét gỡ cấm.',
  ]);
  return getDetail(id_product);
}

// Gỡ cấm: sản phẩm về HIDDEN, người bán kiểm tra lại rồi tự bật hiện
export async function unban(id_product: number) {
  const product = await getDetail(id_product);
  const result = await prisma.product.updateMany({
    where: { id_product, status: 'BANNED' },
    data: { status: 'HIDDEN', ban_reason: null },
  });
  if (result.count === 0) throw new AppError(422, 'PRODUCT_NOT_BANNED', 'Sản phẩm không ở trạng thái bị cấm');

  sendNotice(product.shop.user, 'Sản phẩm của bạn đã được gỡ cấm', [
    `Sản phẩm "${product.product_name}" đã được gỡ cấm và đang ở trạng thái ẩn.`,
    'Vui lòng kiểm tra lại giá, tồn kho rồi bật hiển thị trong trang quản lý sản phẩm.',
  ]);
  return getDetail(id_product);
}
