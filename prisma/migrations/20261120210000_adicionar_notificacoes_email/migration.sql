CREATE TABLE "EmailNotification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailNotification_orderId_eventType_key"
ON "EmailNotification"("orderId", "eventType");

CREATE INDEX "EmailNotification_status_createdAt_idx"
ON "EmailNotification"("status", "createdAt");

ALTER TABLE "EmailNotification"
ADD CONSTRAINT "EmailNotification_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;