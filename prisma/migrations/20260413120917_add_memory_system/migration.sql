-- CreateTable
CREATE TABLE "AgentProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MemoryEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventType" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "sourcePromptId" TEXT,
    "content" TEXT NOT NULL,
    "extractedMemory" TEXT,
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "contentHash" TEXT NOT NULL,
    "processedAt" DATETIME,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SemanticMemory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "embeddingModel" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'learned',
    "confidence" REAL NOT NULL DEFAULT 0.8,
    "sourcePromptId" TEXT,
    "triggerType" TEXT,
    "lastValidatedAt" DATETIME,
    "supersedesId" TEXT,
    "supersededById" TEXT,
    "reason" TEXT,
    "eventId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "decayAt" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "AgentProfile_key_key" ON "AgentProfile"("key");

-- CreateIndex
CREATE INDEX "AgentProfile_isActive_idx" ON "AgentProfile"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MemoryEvent_contentHash_key" ON "MemoryEvent"("contentHash");

-- CreateIndex
CREATE INDEX "MemoryEvent_status_createdAt_idx" ON "MemoryEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "MemoryEvent_sourcePromptId_idx" ON "MemoryEvent"("sourcePromptId");

-- CreateIndex
CREATE INDEX "MemoryEvent_eventType_triggerType_idx" ON "MemoryEvent"("eventType", "triggerType");

-- CreateIndex
CREATE INDEX "SemanticMemory_type_confidence_idx" ON "SemanticMemory"("type", "confidence");

-- CreateIndex
CREATE INDEX "SemanticMemory_sourcePromptId_idx" ON "SemanticMemory"("sourcePromptId");

-- CreateIndex
CREATE INDEX "SemanticMemory_eventId_idx" ON "SemanticMemory"("eventId");

-- CreateIndex
CREATE INDEX "SemanticMemory_supersededById_idx" ON "SemanticMemory"("supersededById");

-- CreateIndex
CREATE INDEX "SemanticMemory_decayAt_idx" ON "SemanticMemory"("decayAt");
