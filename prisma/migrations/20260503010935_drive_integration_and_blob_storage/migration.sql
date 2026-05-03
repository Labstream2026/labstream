-- CreateEnum
CREATE TYPE "EmbedKind" AS ENUM ('NONE', 'IMAGE', 'DRIVE_FILE', 'DRIVE_FOLDER_PHOTOS', 'DRIVE_FOLDER_VIDEOS', 'DRIVE_FOLDER_MIXED', 'VIMEO', 'YOUTUBE', 'DIRECT_VIDEO', 'EXTERNAL_LINK');

-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "blobPath" TEXT,
ADD COLUMN     "caption" TEXT,
ADD COLUMN     "storage" TEXT NOT NULL DEFAULT 'local',
ADD COLUMN     "thumbnailUrl" TEXT;

-- AlterTable
ALTER TABLE "DeliverableVersion" ADD COLUMN     "driveFileCount" INTEGER,
ADD COLUMN     "driveFileId" TEXT,
ADD COLUMN     "driveFolderId" TEXT,
ADD COLUMN     "driveLastCheckedAt" TIMESTAMP(3),
ADD COLUMN     "driveSnapshotJson" JSONB,
ADD COLUMN     "embedKind" "EmbedKind" NOT NULL DEFAULT 'NONE';

-- CreateIndex
CREATE INDEX "Asset_createdAt_idx" ON "Asset"("createdAt");

-- CreateIndex
CREATE INDEX "DeliverableVersion_driveFolderId_idx" ON "DeliverableVersion"("driveFolderId");
