-- CreateEnum
CREATE TYPE "ShopStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'LOCKED');

-- CreateTable
CREATE TABLE "shops" (
    "id_shop" SERIAL NOT NULL,
    "id_user" INTEGER NOT NULL,
    "shop_name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "address" VARCHAR(255) NOT NULL,
    "phone_number" VARCHAR(15) NOT NULL,
    "status" "ShopStatus" NOT NULL DEFAULT 'PENDING',
    "pending_balance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "available_balance" DECIMAL(15,0) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id_shop")
);

-- CreateTable
CREATE TABLE "categories" (
    "id_category" SERIAL NOT NULL,
    "category_name" VARCHAR(100) NOT NULL,
    "id_categories_parent" INTEGER,
    "level" SMALLINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id_category")
);

-- CreateIndex
CREATE UNIQUE INDEX "shops_id_user_key" ON "shops"("id_user");

-- CreateIndex
CREATE UNIQUE INDEX "shops_shop_name_key" ON "shops"("shop_name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_id_categories_parent_category_name_key" ON "categories"("id_categories_parent", "category_name");

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_id_user_fkey" FOREIGN KEY ("id_user") REFERENCES "users"("id_user") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_id_categories_parent_fkey" FOREIGN KEY ("id_categories_parent") REFERENCES "categories"("id_category") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Ràng buộc mà Prisma không khai báo được
ALTER TABLE "shops" ADD CONSTRAINT "shops_balance_check"
  CHECK ("pending_balance" >= 0 AND "available_balance" >= 0);

ALTER TABLE "categories" ADD CONSTRAINT "categories_level_check"
  CHECK ("level" BETWEEN 1 AND 3);  