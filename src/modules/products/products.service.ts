// Người bán quản lý sản phẩm và biến thể (SKU) của shop mình.
// Mọi truy vấn đều lọc theo id_shop lấy từ req.shop: sản phẩm của shop khác coi như không tồn tại (404).
import type { Prisma, Product, Shop } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { toSearchText } from '../../lib/slug';
import { uploadImage, uploadImages, withImageCleanup, type UploadedImage } from '../../lib/cloudinary';
import { MAX_IMAGES } from '../../middlewares/upload';
import { AppError } from '../../middlewares/errorHandler';
import type {
  CreateProductInput, CreateSkuInput, FeaturedInput, ListOwnProductsQuery, UpdateProductInput, UpdateSkuInput,
} from './products.schema';

const MAX_FEATURED = 10; // tối đa 10 sản phẩm nổi bật mỗi shop

type Files = Express.Multer.File[];

// Thư mục lưu ảnh của shop trên Cloudinary
const imageFolder = (shop: Shop) => `fashion/shops/${shop.id_shop}/products`;

const emptyUpdate = () => new AppError(400, 'VALIDATION_ERROR', 'Cần ít nhất một trường để cập nhật');

// Hàm dùng chung 

// Sản phẩm chỉ được gắn vào loại mặt hàng cấp cuối (không có loại con)
async function ensureLeafCategory(id_category: number) {
  const category = await prisma.category.findUnique({
    where: { id_category },
    include: { _count: { select: { children: true } } },
  });
  if (!category) throw new AppError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy loại mặt hàng');
  if (category._count.children > 0) {
    throw new AppError(422, 'CATEGORY_NOT_LEAF', 'Chỉ được chọn loại mặt hàng cấp cuối (không có loại con)');
  }
}

// kiểm tra mã SKU trước khi tạo hoặc cập nhật sản phẩm, đảm bảo mã SKU không bị trùng trong cùng một shop.
async function ensureSkuCodesFree(id_shop: number, codes: string[], excludeSkuId?: number) {
  const dup = await prisma.sku.findFirst({
    where: {
      sku_code: { in: codes },
      NOT: excludeSkuId ? { id_sku: excludeSkuId } : undefined,
      product: { id_shop, status: { not: 'DELETED' } },
    },
    select: { sku_code: true },
  });
  if (dup) throw new AppError(409, 'SKU_CODE_EXISTS', `Mã SKU "${dup.sku_code}" đã được dùng trong shop`);
}

// Tính lại giá thấp nhất / cao nhất từ các SKU đang bán (để lọc, sắp xếp theo giá)
async function refreshPriceRange(tx: Prisma.TransactionClient, id_product: number) {
  const agg = await tx.sku.aggregate({
    where: { id_product, is_active: true },
    _min: { price: true },
    _max: { price: true },
  });
  await tx.product.update({
    where: { id_product },
    data: { min_price: agg._min.price, max_price: agg._max.price },
  });
}

// Lấy sản phẩm của shop mình 
async function findOwn(shop: Shop, id_product: number): Promise<Product> {
  const product = await prisma.product.findFirst({
    where: { id_product, id_shop: shop.id_shop, status: { not: 'DELETED' } },
  });
  if (!product) throw new AppError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm');
  return product;
}

const withSkus = {
  skus: { orderBy: [{ color: 'asc' }, { size: 'asc' }] },
} satisfies Prisma.ProductInclude;

// Sản phẩm 

export async function create(shop: Shop, input: CreateProductInput, files: Files) {
  //  Kiểm tra hết dữ liệu trước, chưa tải ảnh lên (request sai thì không để lại ảnh rác)
  await ensureLeafCategory(input.id_category);
  await ensureSkuCodesFree(shop.id_shop, input.skus.map((s) => s.sku_code));
  if (files.length === 0) throw new AppError(400, 'NO_FILES', 'Cần ít nhất 1 ảnh sản phẩm (trường "images")');

  // 2. Hợp lệ hết mới tải ảnh lên Cloudinary
  const uploaded = await uploadImages(files, imageFolder(shop));

  // 3. Lưu sản phẩm và toàn bộ biến thể trong một transaction; lỗi thì xóa ảnh vừa tải
  const prices = input.skus.map((s) => s.price);
  const { skus, ...fields } = input;
  return withImageCleanup(uploaded, () =>
    prisma.product.create({
      data: {
        ...fields,
        id_shop: shop.id_shop,
        search_name: toSearchText(input.product_name),
        images: uploaded.map((i) => i.url),
        min_price: Math.min(...prices),
        max_price: Math.max(...prices),
        skus: { create: skus },
      },
      include: withSkus,
    }),
  );
}

export async function listOwn(shop: Shop, query: ListOwnProductsQuery) {
  const { status, q, page, limit } = query;
  const where: Prisma.ProductWhereInput = {
    id_shop: shop.id_shop,
    status: status ?? { not: 'DELETED' },
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
        min_price: true, max_price: true, sold_count: true, is_featured: true, created_at: true,
        _count: { select: { skus: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, meta: { page, limit, total, total_pages: Math.ceil(total / limit) } };
}

export async function getDetailProduct(shop: Shop, id_product: number) {
  await findOwn(shop, id_product);
  return prisma.product.findUniqueOrThrow({
    where: { id_product },
    include: { ...withSkus, category: { select: { id_category: true, category_name: true } } },
  });
}

// Sửa nội dung; sản phẩm bị cấm vẫn sửa được để người bán khắc phục
export async function update(shop: Shop, id_product: number, input: UpdateProductInput, files: Files) {
  const product = await findOwn(shop, id_product);
  const { keep_images, ...fields } = input;
  if (Object.keys(fields).length === 0 && keep_images === undefined && files.length === 0) throw emptyUpdate();
  if (fields.id_category) await ensureLeafCategory(fields.id_category);

  // Ảnh: chỉ xử lý khi có gửi keep_images hoặc file mới
  let uploaded: UploadedImage[] = [];
  let images: string[] | undefined;
  if (keep_images !== undefined || files.length > 0) {
    const keep = keep_images ?? product.images;
    if (keep.some((url) => !product.images.includes(url))) {
      throw new AppError(400, 'INVALID_KEEP_IMAGE', 'keep_images chỉ được chứa ảnh hiện có của sản phẩm');
    }
    const total = keep.length + files.length;
    if (total < 1 || total > MAX_IMAGES) {
      throw new AppError(400, 'IMAGE_COUNT_INVALID', `Sản phẩm phải có từ 1 đến ${MAX_IMAGES} ảnh`);
    }
    uploaded = await uploadImages(files, imageFolder(shop));
    images = [...keep, ...uploaded.map((i) => i.url)];
  }

  return withImageCleanup(uploaded, () =>
    prisma.product.update({
      where: { id_product },
      data: {
        ...fields,
        ...(fields.product_name && { search_name: toSearchText(fields.product_name) }),
        ...(images && { images }),
      },
      include: withSkus,
    }),
  );
}

// Người bán ẩn / hiện sản phẩm. Sản phẩm bị cấm thì không tự đổi được.
export async function setStatus(shop: Shop, id_product: number, status: 'ACTIVE' | 'HIDDEN') {
  const product = await findOwn(shop, id_product);
  if (product.status === 'BANNED') {
    throw new AppError(422, 'PRODUCT_BANNED', 'Sản phẩm đang bị cấm, không thể đổi trạng thái');
  }
  if (status === 'ACTIVE') {
    const activeSkus = await prisma.sku.count({ where: { id_product, is_active: true } });
    if (activeSkus === 0) {
      throw new AppError(422, 'NO_ACTIVE_SKU', 'Cần ít nhất một biến thể đang bán để hiện sản phẩm');
    }
  }

  // Cập nhật có điều kiện: tránh ghi đè nếu admin vừa cấm đúng lúc này
  const result = await prisma.product.updateMany({
    where: { id_product, status: { in: ['ACTIVE', 'HIDDEN'] } },
    data: { status, ...(status === 'HIDDEN' && { is_featured: false, featured_order: null }) },
  });
  if (result.count === 0) {
    throw new AppError(409, 'PRODUCT_STATUS_CHANGED', 'Trạng thái sản phẩm vừa thay đổi, vui lòng tải lại');
  }
  return prisma.product.findUniqueOrThrow({ where: { id_product } });
}

// Xóa mềm: giữ dữ liệu cho đơn hàng cũ, sản phẩm biến mất khỏi mọi danh sách
export async function remove(shop: Shop, id_product: number) {
  await findOwn(shop, id_product);
  await prisma.product.update({
    where: { id_product },
    data: { status: 'DELETED', is_featured: false, featured_order: null },
  });
}

// Bật / tắt sản phẩm nổi bật (tối đa 10 sản phẩm mỗi shop, phải đang bán)
export async function setFeatured(shop: Shop, id_product: number, input: FeaturedInput) {
  const product = await findOwn(shop, id_product);

  if (!input.is_featured) {
    return prisma.product.update({
      where: { id_product },
      data: { is_featured: false, featured_order: null },
    });
  }

  if (product.status !== 'ACTIVE') {
    throw new AppError(422, 'PRODUCT_NOT_ACTIVE', 'Chỉ sản phẩm đang bán mới được đặt nổi bật');
  }
  const featuredCount = await prisma.product.count({
    where: { id_shop: shop.id_shop, is_featured: true, NOT: { id_product } },
  });
  if (featuredCount >= MAX_FEATURED) {
    throw new AppError(422, 'FEATURED_LIMIT_REACHED', `Mỗi shop tối đa ${MAX_FEATURED} sản phẩm nổi bật`);
  }
  return prisma.product.update({
    where: { id_product },
    data: { is_featured: true, featured_order: input.featured_order ?? null },
  });
}

// Biến thể (SKU) 

export async function addSku(shop: Shop, id_product: number, input: CreateSkuInput, file?: Express.Multer.File) {
  await findOwn(shop, id_product);
  await ensureSkuCodesFree(shop.id_shop, [input.sku_code]);

  const dup = await prisma.sku.findFirst({
    where: {
      id_product,
      size: { equals: input.size, mode: 'insensitive' },
      color: { equals: input.color, mode: 'insensitive' },
    },
  });
  if (dup) throw new AppError(409, 'SKU_VARIANT_EXISTS', 'Sản phẩm đã có biến thể cùng size và màu');

  // Ảnh riêng của biến thể (không bắt buộc), tải lên sau khi đã kiểm tra xong
  const uploaded = file ? [await uploadImage(file.buffer, imageFolder(shop))] : [];

  return withImageCleanup(uploaded, () =>
    prisma.$transaction(async (tx) => {
      const sku = await tx.sku.create({ data: { ...input, id_product, image_url: uploaded[0]?.url } });
      await refreshPriceRange(tx, id_product);
      return sku;
    }),
  );
}

export async function updateSku(
  shop: Shop,
  id_product: number,
  id_sku: number,
  input: UpdateSkuInput,
  file?: Express.Multer.File,
) {
  await findOwn(shop, id_product);
  const sku = await prisma.sku.findFirst({ where: { id_sku, id_product } });
  if (!sku) throw new AppError(404, 'SKU_NOT_FOUND', 'Không tìm thấy biến thể');

  const { remove_image, ...fields } = input;
  if (Object.keys(fields).length === 0 && !remove_image && !file) throw emptyUpdate();

  if (fields.sku_code && fields.sku_code !== sku.sku_code) {
    await ensureSkuCodesFree(shop.id_shop, [fields.sku_code], id_sku);
  }

  // Có file mới thì thay ảnh; remove_image = true thì bỏ ảnh
  const uploaded = file ? [await uploadImage(file.buffer, imageFolder(shop))] : [];
  const image_url = uploaded[0]?.url ?? (remove_image ? null : undefined);

  return withImageCleanup(uploaded, () =>
    prisma.$transaction(async (tx) => {
      const updated = await tx.sku.update({
        where: { id_sku },
        data: { ...fields, ...(image_url !== undefined && { image_url }) },
      });
      await refreshPriceRange(tx, id_product);
      return updated;
    }),
  );
}
