-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT,
    "status" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientContact" TEXT,
    "clientEmail" TEXT,
    "preparedBy" TEXT,
    "coverImageUrl" TEXT,
    "tagline" TEXT,
    "intro" TEXT,
    "aboutHeading" TEXT,
    "aboutBody" TEXT,
    "stats" JSONB,
    "selectedWork" JSONB,
    "treatmentHeading" TEXT,
    "treatmentBody" TEXT,
    "treatmentSections" JSONB,
    "moodboard" JSONB,
    "references" JSONB,
    "timeline" JSONB,
    "deliverables" JSONB,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "budgetItems" JSONB,
    "budgetNote" TEXT,
    "taxRatePct" INTEGER,
    "showPrices" BOOLEAN NOT NULL DEFAULT true,
    "ctaHeading" TEXT,
    "ctaBody" TEXT,
    "validUntil" TIMESTAMP(3),
    "accentColor" TEXT,
    "draft" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Proposal_slug_key" ON "Proposal"("slug");

-- CreateIndex
CREATE INDEX "Proposal_slug_idx" ON "Proposal"("slug");

-- CreateIndex
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

-- AddForeignKey
ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
