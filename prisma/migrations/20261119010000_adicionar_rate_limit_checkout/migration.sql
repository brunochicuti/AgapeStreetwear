CREATE TABLE "CheckoutRateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "windowStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutRateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "CheckoutRateLimit_windowStartedAt_idx"
ON "CheckoutRateLimit"("windowStartedAt");
