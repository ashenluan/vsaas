-- AlterTable: Add public preset fields to voices
ALTER TABLE "voices" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "voices" ADD COLUMN IF NOT EXISTS "language" TEXT DEFAULT 'zh-CN';
ALTER TABLE "voices" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE "voices" ADD COLUMN IF NOT EXISTS "tags" JSONB NOT NULL DEFAULT '[]';

-- AlterTable: Add public preset fields to materials
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "materials" ADD COLUMN IF NOT EXISTS "category" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "voices_is_public_idx" ON "voices"("is_public");
CREATE INDEX IF NOT EXISTS "materials_is_public_type_idx" ON "materials"("is_public", "type");
