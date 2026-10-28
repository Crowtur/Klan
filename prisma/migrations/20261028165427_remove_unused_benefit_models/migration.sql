/*
  Warnings:

  - You are about to drop the `Benefit` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PlanBenefit` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PlanBenefit" DROP CONSTRAINT "PlanBenefit_benefitId_fkey";

-- DropForeignKey
ALTER TABLE "PlanBenefit" DROP CONSTRAINT "PlanBenefit_planId_fkey";

-- DropTable
DROP TABLE "Benefit";

-- DropTable
DROP TABLE "PlanBenefit";
