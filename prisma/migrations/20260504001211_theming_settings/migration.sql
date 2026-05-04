-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "colorAccent" TEXT NOT NULL DEFAULT '#7B61FF',
ADD COLUMN     "colorBg" TEXT NOT NULL DEFAULT '#080808',
ADD COLUMN     "colorPrimary" TEXT NOT NULL DEFAULT '#E8640C',
ADD COLUMN     "colorText" TEXT NOT NULL DEFAULT '#F0F0EE',
ADD COLUMN     "faviconUrl" TEXT,
ADD COLUMN     "fontBody" TEXT NOT NULL DEFAULT 'Figtree',
ADD COLUMN     "fontHeading" TEXT NOT NULL DEFAULT 'Instrument Serif';
