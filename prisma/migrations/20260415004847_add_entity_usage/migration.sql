-- CreateTable
CREATE TABLE "EntityUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TestCase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "promptId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Untitled test case',
    "userMessage" TEXT NOT NULL DEFAULT '',
    "variables" TEXT NOT NULL DEFAULT '{}',
    "expectation" TEXT,
    "checks" TEXT NOT NULL DEFAULT '[]',
    "lastRunAt" DATETIME,
    "lastResult" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TestCase_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TestCase" ("checks", "createdAt", "expectation", "id", "lastResult", "lastRunAt", "promptId", "updatedAt", "variables") SELECT "checks", "createdAt", "expectation", "id", "lastResult", "lastRunAt", "promptId", "updatedAt", "variables" FROM "TestCase";
DROP TABLE "TestCase";
ALTER TABLE "new_TestCase" RENAME TO "TestCase";
CREATE INDEX "TestCase_promptId_idx" ON "TestCase"("promptId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EntityUsage_entityType_entityId_createdAt_idx" ON "EntityUsage"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "EntityUsage_action_createdAt_idx" ON "EntityUsage"("action", "createdAt");
