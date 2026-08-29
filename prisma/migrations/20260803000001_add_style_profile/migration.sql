-- AlterTable
ALTER TABLE "Project" ADD COLUMN "styleProfile" JSONB;

-- AlterEnum
ALTER TYPE "AIAction" ADD VALUE IF NOT EXISTS 'consistency';
ALTER TYPE "AIAction" ADD VALUE IF NOT EXISTS 'extract';
ALTER TYPE "AIAction" ADD VALUE IF NOT EXISTS 'summary';
ALTER TYPE "AIAction" ADD VALUE IF NOT EXISTS 'analyzeStyle';
