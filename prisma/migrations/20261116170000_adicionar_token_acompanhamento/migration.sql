ALTER TABLE "Order"
ADD COLUMN "trackingTokenHash" TEXT,
ADD COLUMN "trackingTokenCreatedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Order_trackingTokenHash_key"
ON "Order"("trackingTokenHash");