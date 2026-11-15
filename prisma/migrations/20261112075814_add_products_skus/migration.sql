-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'BANNED', 'DELETED');

-- CreateTable
CREATE TABLE "products" (
    "id_product" SERIAL NOT NULL,
    "id_shop" INTEGER NOT NULL,
    "id_category" INTEGER NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "search_name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "attributes" JSONB,
    "images" TEXT[],
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "ban_reason" TEXT,
    "min_price" DECIMAL(15,0),
    "max_price" DECIMAL(15,0),
    "sold_count" INTEGER NOT NULL DEFAULT 0,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_order" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id_product")
);

-- CreateTable
CREATE TABLE "skus" (
    "id_sku" SERIAL NOT NULL,
    "id_product" INTEGER NOT NULL,
    "sku_code" VARCHAR(50) NOT NULL,
    "size" VARCHAR(20) NOT NULL,
    "color" VARCHAR(50) NOT NULL,
    "price" DECIMAL(15,0) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "image_url" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skus_pkey" PRIMARY KEY ("id_sku")
);

-- CreateIndex
CREATE INDEX "products_id_shop_status_idx" ON "products"("id_shop", "status");

-- CreateIndex
CREATE INDEX "products_id_category_status_idx" ON "products"("id_category", "status");

-- CreateIndex
CREATE INDEX "products_status_created_at_idx" ON "products"("status", "created_at");

-- CreateIndex
CREATE INDEX "products_sold_count_idx" ON "products"("sold_count");

-- CreateIndex
CREATE UNIQUE INDEX "skus_id_product_size_color_key" ON "skus"("id_product", "size", "color");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_id_shop_fkey" FOREIGN KEY ("id_shop") REFERENCES "shops"("id_shop") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_id_category_fkey" FOREIGN KEY ("id_category") REFERENCES "categories"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skus" ADD CONSTRAINT "skus_id_product_fkey" FOREIGN KEY ("id_product") REFERENCES "products"("id_product") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Ràng buộc dữ liệu cho sản phẩm và biến thể
ALTER TABLE "skus" ADD CONSTRAINT "skus_price_check" CHECK ("price" > 0);
ALTER TABLE "skus" ADD CONSTRAINT "skus_stock_check" CHECK ("stock" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_sold_count_check" CHECK ("sold_count" >= 0);
ALTER TABLE "products" ADD CONSTRAINT "products_images_check" CHECK (cardinality("images") BETWEEN 1 AND 9);