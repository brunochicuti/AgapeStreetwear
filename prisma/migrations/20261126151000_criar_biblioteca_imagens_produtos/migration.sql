CREATE TYPE "ProductImageAngle" AS ENUM (
  'FRENTE',
  'LADO',
  'COSTAS'
);

CREATE TABLE "ProductImage" (
  "id" TEXT NOT NULL,
  "stripeProductId" TEXT NOT NULL,
  "angle" "ProductImageAngle" NOT NULL,
  "url" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductImage_stripeProductId_angle_key"
ON "ProductImage"("stripeProductId", "angle");

CREATE INDEX "ProductImage_stripeProductId_idx"
ON "ProductImage"("stripeProductId");
