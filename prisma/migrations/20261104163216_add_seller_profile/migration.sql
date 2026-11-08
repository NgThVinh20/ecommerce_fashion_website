-- AlterTable
ALTER TABLE "shops" ADD COLUMN     "bank_account_name" VARCHAR(100),
ADD COLUMN     "bank_account_number" VARCHAR(20),
ADD COLUMN     "bank_name" VARCHAR(100),
ADD COLUMN     "bank_updated_at" TIMESTAMP(3),
ADD COLUMN     "name_updated_at" TIMESTAMP(3),
ADD COLUMN     "reject_reason" TEXT,
ADD COLUMN     "tax_code" VARCHAR(14);
