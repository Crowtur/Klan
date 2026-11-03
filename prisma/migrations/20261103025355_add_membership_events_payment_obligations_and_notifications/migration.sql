-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('RECURRING', 'ONE_TIME');

-- CreateEnum
CREATE TYPE "MembershipEventType" AS ENUM ('JOINED', 'REACTIVATED', 'SUSPENDED', 'REMOVED', 'LEFT', 'FINISHED', 'ROLE_CHANGED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_SUBMITTED', 'DOCUMENTS_SUBMITTED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'MEMBER_LEFT', 'MEMBER_REMOVED', 'RESERVATION_CREATED', 'RESERVATION_CANCELLED', 'SETTLEMENT_UPDATED');

-- CreateEnum
CREATE TYPE "PaymentObligationStatus" AS ENUM ('OPEN', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED');

-- AlterEnum
ALTER TYPE "DurationUnit" ADD VALUE 'DAY';

-- AlterEnum
ALTER TYPE "MembershipStatus" ADD VALUE 'FINISHED';

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'FINISHED';

-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "address" TEXT,
ADD COLUMN     "coverFileKey" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "googleMapsUrl" TEXT,
ADD COLUMN     "timeZone" TEXT NOT NULL DEFAULT 'America/Guayaquil';

-- AlterTable
ALTER TABLE "ClubMembership" ADD COLUMN     "finishedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MembershipDocument" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "fileSizeBytes" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MembershipPlan" ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'RECURRING';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "obligationId" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "billingMode" "BillingMode" NOT NULL DEFAULT 'RECURRING',
ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "currencySnapshot" TEXT,
ADD COLUMN     "durationUnitSnapshot" "DurationUnit",
ADD COLUMN     "durationValueSnapshot" INTEGER,
ADD COLUMN     "finishedAt" TIMESTAMP(3),
ADD COLUMN     "firstActivatedAt" TIMESTAMP(3),
ADD COLUMN     "nextBillingAt" TIMESTAMP(3),
ADD COLUMN     "planNameSnapshot" TEXT,
ADD COLUMN     "priceSnapshot" DECIMAL(10,2);

-- CreateTable
CREATE TABLE "MembershipEvent" (
    "id" TEXT NOT NULL,
    "clubMembershipId" TEXT NOT NULL,
    "type" "MembershipEventType" NOT NULL,
    "previousStatus" "MembershipStatus",
    "newStatus" "MembershipStatus" NOT NULL,
    "previousRole" "ClubRole",
    "newRole" "ClubRole" NOT NULL,
    "actorId" TEXT,
    "reason" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventKey" TEXT NOT NULL,

    CONSTRAINT "MembershipEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "status" "DocumentStatus" NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,
    "rejectionReason" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentObligation" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "obligationKey" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "PaymentObligationStatus" NOT NULL DEFAULT 'OPEN',
    "dueAt" TIMESTAMP(3),
    "periodStartAt" TIMESTAMP(3),
    "periodEndAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentObligation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "clubId" TEXT,
    "type" "NotificationType" NOT NULL,
    "eventKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT,
    "targetPath" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "stripeCreatedAt" TIMESTAMP(3) NOT NULL,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipEvent_eventKey_key" ON "MembershipEvent"("eventKey");

-- CreateIndex
CREATE INDEX "MembershipEvent_clubMembershipId_occurredAt_idx" ON "MembershipEvent"("clubMembershipId", "occurredAt");

-- CreateIndex
CREATE INDEX "MembershipEvent_type_occurredAt_idx" ON "MembershipEvent"("type", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipDocumentVersion_documentId_version_key" ON "MembershipDocumentVersion"("documentId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentObligation_obligationKey_key" ON "PaymentObligation"("obligationKey");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentObligation_stripeInvoiceId_key" ON "PaymentObligation"("stripeInvoiceId");

-- CreateIndex
CREATE INDEX "PaymentObligation_userId_status_dueAt_idx" ON "PaymentObligation"("userId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "PaymentObligation_clubId_status_dueAt_idx" ON "PaymentObligation"("clubId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "PaymentObligation_subscriptionId_idx" ON "PaymentObligation"("subscriptionId");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_clubId_resolvedAt_idx" ON "Notification"("recipientId", "clubId", "resolvedAt");

-- CreateIndex
CREATE INDEX "Notification_entityType_entityId_idx" ON "Notification"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_recipientId_eventKey_key" ON "Notification"("recipientId", "eventKey");

-- CreateIndex
CREATE INDEX "StripeWebhookEvent_status_receivedAt_idx" ON "StripeWebhookEvent"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "Payment_obligationId_idx" ON "Payment"("obligationId");

-- CreateIndex
CREATE INDEX "Payment_clubId_status_paidAt_idx" ON "Payment"("clubId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "Payment_userId_status_paidAt_idx" ON "Payment"("userId", "status", "paidAt");

-- CreateIndex
CREATE INDEX "Subscription_planId_firstActivatedAt_idx" ON "Subscription"("planId", "firstActivatedAt");

-- CreateIndex
CREATE INDEX "Subscription_status_billingMode_expiresAt_idx" ON "Subscription"("status", "billingMode", "expiresAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_obligationId_fkey" FOREIGN KEY ("obligationId") REFERENCES "PaymentObligation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipEvent" ADD CONSTRAINT "MembershipEvent_clubMembershipId_fkey" FOREIGN KEY ("clubMembershipId") REFERENCES "ClubMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipDocumentVersion" ADD CONSTRAINT "MembershipDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "MembershipDocument"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentObligation" ADD CONSTRAINT "PaymentObligation_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE CASCADE ON UPDATE CASCADE;
