ALTER TABLE "Facility" ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'building';
CREATE TABLE "ClubBankDetails" (
  "clubId" TEXT PRIMARY KEY REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "beneficiary" TEXT NOT NULL, "identity" TEXT NOT NULL, "bankName" TEXT NOT NULL,
  "accountType" TEXT NOT NULL, "accountNumber" TEXT NOT NULL
);
CREATE TABLE "AvatarThumbnail" ("key" TEXT PRIMARY KEY,"small" BYTEA NOT NULL,"large" BYTEA NOT NULL);
