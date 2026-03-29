-- AlterEnum
ALTER TYPE "GenerationType" ADD VALUE 'BATCH_COMPOSE';

-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "external_id" TEXT;
