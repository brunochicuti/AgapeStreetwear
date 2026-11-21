CREATE TABLE "WhatsAppSession" (
    "id" TEXT NOT NULL DEFAULT 'baileys',
    "encryptedCreds" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsAppSessionKey" (
    "keyType" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WhatsAppSessionKey_pkey" PRIMARY KEY ("keyType", "keyId")
);