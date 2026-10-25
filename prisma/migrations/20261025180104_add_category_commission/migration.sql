-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "commission_rate" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "categories" ADD CONSTRAINT "categories_commission_check"
  CHECK ("commission_rate" >= 0 AND "commission_rate" <= 100);