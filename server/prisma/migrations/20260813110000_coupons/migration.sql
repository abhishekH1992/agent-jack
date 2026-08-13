-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" DECIMAL(5,2) NOT NULL,
    "minSpendNzd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "maxDiscountNzd" DECIMAL(10,2),
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "allowWithRewards" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "couponId" TEXT;
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "couponDiscountNzd" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
