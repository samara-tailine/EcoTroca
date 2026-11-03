-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DisposalStatus" AS ENUM ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EcoCoinMovementType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "studentIdentifier" VARCHAR(64),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessProfile" (
    "id" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AccessProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAccessProfile" (
    "userId" UUID NOT NULL,
    "accessProfileId" UUID NOT NULL,
    "assignedByUserId" UUID,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAccessProfile_pkey" PRIMARY KEY ("userId","accessProfileId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500),
    "averageWeightGrams" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalRequest" (
    "id" UUID NOT NULL,
    "requesterId" UUID NOT NULL,
    "status" "DisposalStatus" NOT NULL DEFAULT 'PENDING',
    "conversionRateCoinsPerKgSnapshot" DECIMAL(12,4) NOT NULL,
    "requestedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMPTZ(6),
    "approvedAt" TIMESTAMPTZ(6),
    "reviewedById" UUID,
    "reviewNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "DisposalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisposalItem" (
    "id" UUID NOT NULL,
    "disposalRequestId" UUID NOT NULL,
    "equipmentId" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "averageWeightGramsSnapshot" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisposalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcoCoinWallet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EcoCoinWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcoCoinMovement" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "type" "EcoCoinMovementType" NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL,
    "balanceAfter" DECIMAL(14,4) NOT NULL,
    "disposalRequestId" UUID,
    "createdByUserId" UUID,
    "description" VARCHAR(500),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcoCoinMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "value" JSONB NOT NULL,
    "description" VARCHAR(500),
    "createdByUserId" UUID,
    "updatedByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_studentIdentifier_key" ON "User"("studentIdentifier");

-- CreateIndex
CREATE INDEX "User_isActive_name_idx" ON "User"("isActive", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AccessProfile_key_key" ON "AccessProfile"("key");

-- CreateIndex
CREATE INDEX "UserAccessProfile_accessProfileId_idx" ON "UserAccessProfile"("accessProfileId");

-- CreateIndex
CREATE INDEX "UserAccessProfile_assignedByUserId_idx" ON "UserAccessProfile"("assignedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Equipment_categoryId_isActive_idx" ON "Equipment"("categoryId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_categoryId_name_key" ON "Equipment"("categoryId", "name");

-- CreateIndex
CREATE INDEX "DisposalRequest_requesterId_status_requestedAt_idx" ON "DisposalRequest"("requesterId", "status", "requestedAt");

-- CreateIndex
CREATE INDEX "DisposalRequest_status_requestedAt_idx" ON "DisposalRequest"("status", "requestedAt");

-- CreateIndex
CREATE INDEX "DisposalRequest_reviewedById_idx" ON "DisposalRequest"("reviewedById");

-- CreateIndex
CREATE INDEX "DisposalItem_equipmentId_idx" ON "DisposalItem"("equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "DisposalItem_disposalRequestId_equipmentId_key" ON "DisposalItem"("disposalRequestId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EcoCoinWallet_userId_key" ON "EcoCoinWallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EcoCoinMovement_disposalRequestId_key" ON "EcoCoinMovement"("disposalRequestId");

-- CreateIndex
CREATE INDEX "EcoCoinMovement_walletId_createdAt_idx" ON "EcoCoinMovement"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "EcoCoinMovement_createdByUserId_createdAt_idx" ON "EcoCoinMovement"("createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "SystemSetting_updatedByUserId_idx" ON "SystemSetting"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "UserAccessProfile" ADD CONSTRAINT "UserAccessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessProfile" ADD CONSTRAINT "UserAccessProfile_accessProfileId_fkey" FOREIGN KEY ("accessProfileId") REFERENCES "AccessProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAccessProfile" ADD CONSTRAINT "UserAccessProfile_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRequest" ADD CONSTRAINT "DisposalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalRequest" ADD CONSTRAINT "DisposalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalItem" ADD CONSTRAINT "DisposalItem_disposalRequestId_fkey" FOREIGN KEY ("disposalRequestId") REFERENCES "DisposalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisposalItem" ADD CONSTRAINT "DisposalItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcoCoinWallet" ADD CONSTRAINT "EcoCoinWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "EcoCoinWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_disposalRequestId_fkey" FOREIGN KEY ("disposalRequestId") REFERENCES "DisposalRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcoCoinMovement" ADD CONSTRAINT "EcoCoinMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemSetting" ADD CONSTRAINT "SystemSetting_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Domain checks not expressible in Prisma Schema Language.
ALTER TABLE "Equipment"
  ADD CONSTRAINT "Equipment_averageWeightGrams_positive_check"
  CHECK ("averageWeightGrams" > 0);

ALTER TABLE "DisposalRequest"
  ADD CONSTRAINT "DisposalRequest_conversionRate_positive_check"
  CHECK ("conversionRateCoinsPerKgSnapshot" > 0),
  ADD CONSTRAINT "DisposalRequest_approved_review_check"
  CHECK ("status" <> 'APPROVED' OR ("approvedAt" IS NOT NULL AND "reviewedAt" IS NOT NULL));

ALTER TABLE "DisposalItem"
  ADD CONSTRAINT "DisposalItem_quantity_positive_check"
  CHECK ("quantity" > 0),
  ADD CONSTRAINT "DisposalItem_weightSnapshot_positive_check"
  CHECK ("averageWeightGramsSnapshot" > 0);

ALTER TABLE "EcoCoinWallet"
  ADD CONSTRAINT "EcoCoinWallet_balance_nonnegative_check"
  CHECK ("balance" >= 0);

ALTER TABLE "EcoCoinMovement"
  ADD CONSTRAINT "EcoCoinMovement_amount_positive_check"
  CHECK ("amount" > 0),
  ADD CONSTRAINT "EcoCoinMovement_balanceAfter_nonnegative_check"
  CHECK ("balanceAfter" >= 0),
  ADD CONSTRAINT "EcoCoinMovement_disposal_credit_check"
  CHECK ("disposalRequestId" IS NULL OR "type" = 'CREDIT');