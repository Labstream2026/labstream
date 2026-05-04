-- CreateEnum
CREATE TYPE "PortfolioCategory" AS ENUM ('COMERCIAL', 'DOCUMENTAL', 'FOTOGRAFIA', 'STREAMING', 'BRANDED_CONTENT', 'REDES_SOCIALES', 'POST_PRODUCCION', 'IA', 'OTRO');

-- CreateEnum
CREATE TYPE "BlogPostStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "capabilities" JSONB,
ADD COLUMN     "heroImageUrl" TEXT,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "pricing" TEXT,
ADD COLUMN     "process" JSONB;

-- CreateTable
CREATE TABLE "PortfolioProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "client" TEXT,
    "category" "PortfolioCategory" NOT NULL DEFAULT 'COMERCIAL',
    "year" INTEGER NOT NULL,
    "excerpt" TEXT,
    "brief" TEXT,
    "process" TEXT,
    "result" TEXT,
    "coverImageUrl" TEXT,
    "videoUrl" TEXT,
    "galleryImages" JSONB,
    "beforeAfter" JSONB,
    "credits" JSONB,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "coverImageUrl" TEXT,
    "authorName" TEXT,
    "authorRole" TEXT,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "BlogPostStatus" NOT NULL DEFAULT 'DRAFT',
    "readMinutes" INTEGER,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorRole" TEXT,
    "authorCompany" TEXT,
    "authorAvatarUrl" TEXT,
    "body" TEXT NOT NULL,
    "rating" INTEGER,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientLogo" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientLogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaqItem" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FaqItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "bio" TEXT,
    "photoUrl" TEXT,
    "instagram" TEXT,
    "vimeo" TEXT,
    "linkedin" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSignup" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterSignup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AboutContent" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroEyebrow" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "story" TEXT,
    "mission" TEXT,
    "vision" TEXT,
    "values" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProject_slug_key" ON "PortfolioProject"("slug");

-- CreateIndex
CREATE INDEX "PortfolioProject_category_idx" ON "PortfolioProject"("category");

-- CreateIndex
CREATE INDEX "PortfolioProject_year_idx" ON "PortfolioProject"("year");

-- CreateIndex
CREATE INDEX "PortfolioProject_featured_idx" ON "PortfolioProject"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- CreateIndex
CREATE INDEX "BlogPost_status_idx" ON "BlogPost"("status");

-- CreateIndex
CREATE INDEX "BlogPost_publishedAt_idx" ON "BlogPost"("publishedAt");

-- CreateIndex
CREATE INDEX "BlogPost_category_idx" ON "BlogPost"("category");

-- CreateIndex
CREATE INDEX "Testimonial_visible_order_idx" ON "Testimonial"("visible", "order");

-- CreateIndex
CREATE INDEX "ClientLogo_visible_order_idx" ON "ClientLogo"("visible", "order");

-- CreateIndex
CREATE INDEX "FaqItem_visible_order_idx" ON "FaqItem"("visible", "order");

-- CreateIndex
CREATE INDEX "TeamMember_visible_order_idx" ON "TeamMember"("visible", "order");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSignup_email_key" ON "NewsletterSignup"("email");
