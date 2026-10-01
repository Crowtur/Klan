/*
  Warnings:

  - You are about to drop the `StripeConnectAccount` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StripeConnectAccount" DROP CONSTRAINT "StripeConnectAccount_clubId_fkey";

-- DropTable
DROP TABLE "StripeConnectAccount";
