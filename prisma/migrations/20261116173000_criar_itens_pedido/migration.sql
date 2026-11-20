CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT,
    "stripeProductId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitPrice" INTEGER NOT NULL,
    "image" TEXT,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderItem_orderId_idx"
ON "OrderItem"("orderId");

CREATE INDEX "OrderItem_productId_idx"
ON "OrderItem"("productId");

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrderItem"
ADD CONSTRAINT "OrderItem_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "OrderItem" (
    "id",
    "orderId",
    "productId",
    "stripeProductId",
    "name",
    "description",
    "quantity",
    "unitPrice",
    "image"
)
SELECT
    'legacy_' || md5(op."A" || ':' || op."B"),
    op."A",
    op."B",
    NULL,
    p."name",
    p."description",
    p."quantity"::INTEGER,
    p."price"::INTEGER,
    p."image"
FROM "_OrderToProduct" op
INNER JOIN "Product" p ON p."id" = op."B";