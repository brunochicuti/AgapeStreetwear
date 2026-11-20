CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx"
ON "OrderStatusHistory"("orderId", "createdAt");

ALTER TABLE "OrderStatusHistory"
ADD CONSTRAINT "OrderStatusHistory_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Registra somente o status atual conhecido dos pedidos existentes.
INSERT INTO "OrderStatusHistory" (
    "id",
    "orderId",
    "fromStatus",
    "toStatus",
    "source",
    "createdAt"
)
SELECT
    'migration_' || "id",
    "id",
    NULL,
    "status",
    'migration',
    "createdDate"
FROM "Order";