-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "logoFileKey" TEXT,
ADD COLUMN     "logoUrl" TEXT;

-- AlterTable
ALTER TABLE "MembershipDocument" ADD COLUMN     "fileKey" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarFileKey" TEXT,
ADD COLUMN     "avatarUrl" TEXT;
