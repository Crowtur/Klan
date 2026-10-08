-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateTable
CREATE TABLE "FacilitySchedule" (
    "id" TEXT NOT NULL,
    "facilityId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "openingTime" TEXT NOT NULL,
    "closingTime" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilitySchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FacilitySchedule_facilityId_idx" ON "FacilitySchedule"("facilityId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitySchedule_facilityId_dayOfWeek_key" ON "FacilitySchedule"("facilityId", "dayOfWeek");

-- AddForeignKey
ALTER TABLE "FacilitySchedule" ADD CONSTRAINT "FacilitySchedule_facilityId_fkey" FOREIGN KEY ("facilityId") REFERENCES "Facility"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
