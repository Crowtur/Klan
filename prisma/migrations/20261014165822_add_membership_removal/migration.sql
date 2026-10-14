-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'REMOVED';

-- AlterTable
ALTER TABLE "ClubMembership" ADD COLUMN     "removalReason" TEXT,
ADD COLUMN     "removedAt" TIMESTAMP(3),
ADD COLUMN     "removedById" TEXT;

-- CreateIndex
CREATE INDEX "ClubMembership_clubId_status_idx" ON "ClubMembership"("clubId", "status");
