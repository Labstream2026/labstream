-- AlterTable
ALTER TABLE "PortfolioProject" ADD COLUMN "draft" JSONB;

-- AlterTable
ALTER TABLE "BlogPost" ADD COLUMN "draft" JSONB;

-- AlterTable
ALTER TABLE "Service" ADD COLUMN "draft" JSONB;

-- AlterTable
ALTER TABLE "AboutContent" ADD COLUMN "draft" JSONB;
