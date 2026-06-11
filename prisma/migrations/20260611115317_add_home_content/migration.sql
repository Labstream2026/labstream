-- CreateTable
CREATE TABLE "HomeContent" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "heroBadgeTag" TEXT,
    "heroBadgeText" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "heroCtaPrimaryLabel" TEXT,
    "heroCtaPrimaryHref" TEXT,
    "heroCtaSecondaryLabel" TEXT,
    "heroCtaSecondaryHref" TEXT,
    "heroBackgroundImage" TEXT,
    "heroBackgroundVideo" TEXT,
    "stats" JSONB,
    "processEyebrow" TEXT,
    "processTitle" TEXT,
    "processSteps" JSONB,
    "ctaEyebrow" TEXT,
    "ctaTitle" TEXT,
    "ctaSubtitle" TEXT,
    "ctaPrimaryLabel" TEXT,
    "ctaPrimaryHref" TEXT,
    "ctaSecondaryLabel" TEXT,
    "ctaSecondaryHref" TEXT,
    "draft" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeContent_pkey" PRIMARY KEY ("id")
);
