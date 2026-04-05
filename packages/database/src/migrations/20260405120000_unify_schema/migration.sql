-- Migration: Unify API and packages/database schemas
-- This migration brings production DB in sync with the unified schema.
-- Uses idempotent patterns (IF NOT EXISTS) for safety.

-- ==================== 1. Add missing JobType enum values ====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STYLE_COPY' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'STYLE_COPY';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TEXT_EDIT' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'TEXT_EDIT';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'HANDHELD_PRODUCT' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'HANDHELD_PRODUCT';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'MULTI_FUSION' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'MULTI_FUSION';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIRTUAL_TRYON' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'VIRTUAL_TRYON';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'INPAINT' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'INPAINT';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IMAGE_EDIT' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'IMAGE_EDIT';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'STORYBOARD' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'STORYBOARD';
  END IF;
END $$;

-- Legacy types (backwards compatibility)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'IMAGE' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'IMAGE';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIDEO' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'VIDEO';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TTS' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'TTS';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'DIGITAL_HUMAN' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'DIGITAL_HUMAN';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'VIDEO_EDIT' AND enumtypid = '"JobType"'::regtype) THEN
    ALTER TYPE "JobType" ADD VALUE 'VIDEO_EDIT';
  END IF;
END $$;

-- ==================== 2. Add TEMPLATE to MaterialType ====================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'TEMPLATE' AND enumtypid = '"MaterialType"'::regtype) THEN
    ALTER TYPE "MaterialType" ADD VALUE 'TEMPLATE';
  END IF;
END $$;

-- ==================== 3. Create new tables ====================

-- OAuthAccount
CREATE TABLE IF NOT EXISTS "oauth_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_provider_id_key"
  ON "oauth_accounts"("provider", "provider_id");

ALTER TABLE "oauth_accounts" DROP CONSTRAINT IF EXISTS "oauth_accounts_user_id_fkey";
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Favorite
CREATE TABLE IF NOT EXISTS "favorites" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "generation_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "favorites_user_id_generation_id_key"
  ON "favorites"("user_id", "generation_id");

ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_user_id_fkey";
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "favorites_generation_id_fkey";
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_generation_id_fkey"
  FOREIGN KEY ("generation_id") REFERENCES "generations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- SystemConfig
CREATE TABLE IF NOT EXISTS "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "system_configs_key_key" ON "system_configs"("key");

-- ==================== 4. Add missing columns to existing tables ====================

-- Orders: add updated_at
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3);
-- Backfill updated_at with created_at for existing rows
UPDATE "orders" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "orders" ALTER COLUMN "updated_at" SET NOT NULL;

-- ProviderConfig: add created_at
ALTER TABLE "provider_configs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
-- Set default for api_key
ALTER TABLE "provider_configs" ALTER COLUMN "api_key" SET DEFAULT '';

-- ==================== 5. Add missing indexes ====================

-- Generations: add [user_id, type] and standalone [status] indexes
CREATE INDEX IF NOT EXISTS "generations_user_id_type_idx" ON "generations"("user_id", "type");
CREATE INDEX IF NOT EXISTS "generations_status_idx" ON "generations"("status");

-- Orders: add status index
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

-- AuditLog: add action index
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");

-- Templates: add indexes (may already exist)
CREATE INDEX IF NOT EXISTS "templates_category_idx" ON "templates"("category");
CREATE INDEX IF NOT EXISTS "templates_is_public_idx" ON "templates"("is_public");

-- ==================== 6. Add missing constraints ====================

-- CreditTransaction: unique constraint on [reference_id, type]
-- Use DO block because CREATE UNIQUE INDEX IF NOT EXISTS works but ALTER TABLE ADD CONSTRAINT doesn't have IF NOT EXISTS
CREATE UNIQUE INDEX IF NOT EXISTS "credit_transactions_reference_id_type_key"
  ON "credit_transactions"("reference_id", "type");

-- ==================== 7. Add missing foreign keys ====================

-- AuditLog -> User (performer)
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_performer_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_performer_id_fkey"
  FOREIGN KEY ("performer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AuditLog -> User (target)
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_target_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_id_fkey"
  FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
