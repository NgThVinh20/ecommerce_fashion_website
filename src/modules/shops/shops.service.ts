import { prisma } from '../../lib/prisma';
import { slugify } from '../../lib/slug';
import { AppError } from '../../middlewares/errorHandler';
import type { RegisterShopInput, UpdateShopInput } from './shops.schema';


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

export async function update(id_shop: number, input: UpdateShopInput) {
  return prisma.shop.update({ where: { id_shop }, data: input });
}