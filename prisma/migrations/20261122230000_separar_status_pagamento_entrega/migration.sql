ALTER TABLE "Order"
ADD COLUMN "fulfillmentStatus" TEXT NOT NULL DEFAULT 'awaiting_payment';

UPDATE "Order" AS o
SET "fulfillmentStatus" = COALESCE(
    (
        SELECT h."toStatus"
        FROM "OrderStatusHistory" AS h
        WHERE h."orderId" = o."id"
          AND h."source" = 'admin'
        ORDER BY h."createdAt" DESC, h."id" DESC
        LIMIT 1
    ),
    CASE o."status"
        WHEN 'paid' THEN 'pending'
        WHEN 'delivered' THEN 'delivered'
        ELSE 'awaiting_payment'
    END
);