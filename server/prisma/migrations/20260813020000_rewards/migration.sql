-- CreateEnum
CREATE TYPE "RewardRedeemOn" AS ENUM ('FOOD', 'LIQUOR', 'BOTH');

-- CreateEnum
CREATE TYPE "RewardLedgerType" AS ENUM ('EARN_POINTS', 'REDEEM_POINTS', 'RESTORE_POINTS', 'EARN_STAMP', 'REDEEM_STAMP', 'RESTORE_STAMP');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "pointsDiscountNzd" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "stampRedeemed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN "stampMenuId" TEXT;
ALTER TABLE "Order" ADD COLUMN "pointsEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Order" ADD COLUMN "stampsEarned" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RewardSettings" (
    "id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerDollar" DECIMAL(10,4) NOT NULL DEFAULT 1,
    "pointsToRedeem" INTEGER NOT NULL DEFAULT 100,
    "rewardAmountNzd" DECIMAL(10,2) NOT NULL DEFAULT 5,
    "redeemOn" "RewardRedeemOn" NOT NULL DEFAULT 'BOTH',
    "stampsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "stampsRequired" INTEGER NOT NULL DEFAULT 9,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardStampMenu" (
    "id" TEXT NOT NULL,
    "rewardSettingsId" TEXT NOT NULL,
    "menuId" TEXT NOT NULL,

    CONSTRAINT "RewardStampMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserReward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pointsBalance" INTEGER NOT NULL DEFAULT 0,
    "stampsBalance" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "RewardLedgerType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL DEFAULT 0,
    "stampsDelta" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RewardStampMenu_rewardSettingsId_menuId_key" ON "RewardStampMenu"("rewardSettingsId", "menuId");

-- CreateIndex
CREATE UNIQUE INDEX "UserReward_userId_key" ON "UserReward"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RewardLedger_orderId_type_key" ON "RewardLedger"("orderId", "type");

-- CreateIndex
CREATE INDEX "RewardLedger_userId_createdAt_idx" ON "RewardLedger"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_stampMenuId_fkey" FOREIGN KEY ("stampMenuId") REFERENCES "Menu"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardStampMenu" ADD CONSTRAINT "RewardStampMenu_rewardSettingsId_fkey" FOREIGN KEY ("rewardSettingsId") REFERENCES "RewardSettings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardStampMenu" ADD CONSTRAINT "RewardStampMenu_menuId_fkey" FOREIGN KEY ("menuId") REFERENCES "Menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReward" ADD CONSTRAINT "UserReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardLedger" ADD CONSTRAINT "RewardLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
