CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "eventId" TEXT,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "decision" TEXT,
    "justification" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrivacyRequest_eventId_key"
ON "PrivacyRequest"("eventId");

CREATE INDEX "PrivacyRequest_status_receivedAt_idx"
ON "PrivacyRequest"("status", "receivedAt");

CREATE INDEX "PrivacyRequest_userId_idx"
ON "PrivacyRequest"("userId");

ALTER TABLE "PrivacyRequest"
ADD CONSTRAINT "PrivacyRequest_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;