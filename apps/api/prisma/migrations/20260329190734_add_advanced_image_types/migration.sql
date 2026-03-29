-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GenerationType" ADD VALUE 'TEXT_TO_IMAGE';
ALTER TYPE "GenerationType" ADD VALUE 'IMAGE_TO_IMAGE';
ALTER TYPE "GenerationType" ADD VALUE 'TEXT_TO_VIDEO';
ALTER TYPE "GenerationType" ADD VALUE 'IMAGE_TO_VIDEO';
ALTER TYPE "GenerationType" ADD VALUE 'STYLE_COPY';
ALTER TYPE "GenerationType" ADD VALUE 'TEXT_EDIT';
ALTER TYPE "GenerationType" ADD VALUE 'HANDHELD_PRODUCT';
ALTER TYPE "GenerationType" ADD VALUE 'MULTI_FUSION';
ALTER TYPE "GenerationType" ADD VALUE 'VIRTUAL_TRYON';
ALTER TYPE "GenerationType" ADD VALUE 'INPAINT';
ALTER TYPE "GenerationType" ADD VALUE 'STORYBOARD';
