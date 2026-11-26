ALTER TABLE "Order"
ADD COLUMN "paymentRecoveryLockId" TEXT,
ADD COLUMN "paymentRecoveryLockExpiresAt" TIMESTAMP(3);
