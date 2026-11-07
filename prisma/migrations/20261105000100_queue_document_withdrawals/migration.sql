CREATE TABLE "PendingFileDeletion" (
    "fileKey" TEXT PRIMARY KEY,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "PendingFileDeletion_queuedAt_idx" ON "PendingFileDeletion"("queuedAt");
