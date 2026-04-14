-- CreateTable
CREATE TABLE "UsageLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "service" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "requestCount" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "UsageLog_service_createdAt_idx" ON "UsageLog"("service", "createdAt");

-- CreateIndex
CREATE INDEX "UsageLog_provider_createdAt_idx" ON "UsageLog"("provider", "createdAt");
