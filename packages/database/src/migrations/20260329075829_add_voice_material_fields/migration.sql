/*
  Warnings:

  - You are about to drop the `voice_clones` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('IMAGE', 'VIDEO', 'AUDIO', 'BACKGROUND', 'STICKER', 'AVATAR');

-- DropForeignKey
ALTER TABLE "voice_clones" DROP CONSTRAINT "voice_clones_user_id_fkey";

-- AlterTable
ALTER TABLE "generations" ADD COLUMN     "credits_used" INTEGER,
ADD COLUMN     "error_msg" TEXT,
ADD COLUMN     "input" JSONB,
ADD COLUMN     "output" JSONB,
ALTER COLUMN "model" SET DEFAULT '';

-- DropTable
DROP TABLE "voice_clones";

-- CreateTable
CREATE TABLE "voices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "voice_id" TEXT NOT NULL DEFAULT '',
    "sample_url" TEXT,
    "sample_asset_id" TEXT,
    "status" "VoiceCloneStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'qwen',
    "error_message" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MaterialType" NOT NULL,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "size" INTEGER NOT NULL DEFAULT 0,
    "mime_type" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voices_user_id_idx" ON "voices"("user_id");

-- CreateIndex
CREATE INDEX "materials_user_id_type_idx" ON "materials"("user_id", "type");

-- AddForeignKey
ALTER TABLE "voices" ADD CONSTRAINT "voices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
