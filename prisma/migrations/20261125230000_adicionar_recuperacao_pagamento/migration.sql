-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT,
ADD COLUMN "paymentRecoveryExpiresAt" TIMESTAMP(3),
ADD COLUMN "paymentRecoveryTokenHash" TEXT,
ADD COLUMN "paymentReminderSentAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Order_paymentRecoveryTokenHash_key" ON "Order"("paymentRecoveryTokenHash");