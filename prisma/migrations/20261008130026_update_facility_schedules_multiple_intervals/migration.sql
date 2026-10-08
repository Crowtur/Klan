/*
  Warnings:

  - A unique constraint covering the columns `[facilityId,dayOfWeek,intervalOrder]` on the table `FacilitySchedule` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "FacilitySchedule_facilityId_dayOfWeek_key";

-- AlterTable
ALTER TABLE "FacilitySchedule" ADD COLUMN     "intervalOrder" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "FacilitySchedule_facilityId_dayOfWeek_idx" ON "FacilitySchedule"("facilityId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitySchedule_facilityId_dayOfWeek_intervalOrder_key" ON "FacilitySchedule"("facilityId", "dayOfWeek", "intervalOrder");
