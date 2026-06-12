-- AlterTable: borrador en vivo para apariencia + ajustes
ALTER TABLE "SiteSettings" ADD COLUMN "draft" JSONB;

-- CreateTable: borradores de colecciones (equipo, testimonios, logos, FAQs)
CREATE TABLE "PreviewDraft" (
    "key" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PreviewDraft_pkey" PRIMARY KEY ("key")
);
