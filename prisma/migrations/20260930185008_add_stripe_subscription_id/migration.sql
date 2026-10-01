/*
  Warnings:

  - A unique constraint covering the columns `[stripeSubscriptionId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_clubMembershipId_fkey";

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "stripeSubscriptionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_stripeSubscriptionId_key" ON "Subscription"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clubMembershipId_fkey" FOREIGN KEY ("clubMembershipId") REFERENCES "ClubMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
