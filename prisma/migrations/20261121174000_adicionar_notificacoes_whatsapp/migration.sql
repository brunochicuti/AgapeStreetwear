CREATE TABLE "WhatsAppNotification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "sentAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WhatsAppNotification_orderId_eventType_key"
ON "WhatsAppNotification"("orderId", "eventType");

CREATE INDEX "WhatsAppNotification_status_createdAt_idx"
ON "WhatsAppNotification"("status", "createdAt");

ALTER TABLE "WhatsAppNotification"
ADD CONSTRAINT "WhatsAppNotification_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
