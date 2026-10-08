-- AlterTable
ALTER TABLE "FacilitySchedule" ALTER COLUMN "intervalOrder" DROP DEFAULT;

-- CreateTable
CREATE TABLE "FacilityPlanAccess" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "membershipPlanId" TEXT NOT NULL,
    "maxReservationMinutesPerDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityPlanAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilityPlanAccess_facilityId_idx" ON "FacilityPlanAccess"("facilityId");

-- CreateIndex
CREATE INDEX "FacilityPlanAccess_membershipPlanId_idx" ON "FacilityPlanAccess"("membershipPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilityPlanAccess_facilityId_membershipPlanId_key" ON "FacilityPlanAccess"("facilityId", "membershipPlanId");

-- AddForeignKey
ALTER TABLE "FacilityPlanAccess" ADD CONSTRAINT "FacilityPlanAccess_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityPlanAccess" ADD CONSTRAINT "FacilityPlanAccess_membershipPlanId_fkey" FOREIGN KEY ("membershipPlanId") REFERENCES "MembershipPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
