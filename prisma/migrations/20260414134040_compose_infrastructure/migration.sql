-- AlterTable
ALTER TABLE "Module" ADD COLUMN "embedding" BLOB;
ALTER TABLE "Module" ADD COLUMN "embeddingModel" TEXT;
ALTER TABLE "Module" ADD COLUMN "embeddingUpdatedAt" DATETIME;

-- CreateTable
CREATE TABLE "Scenario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "embedding" BLOB,
    "embeddingModel" TEXT,
    "embeddingUpdatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scenarioId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "assembled" TEXT,
    "quality" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Recipe_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "Scenario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RecipeStep" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recipeId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "moduleId" TEXT,
    "inline" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecipeStep_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RecipeStep_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PromptModuleUse" (
    "promptId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "order" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY ("promptId", "moduleId"),
    CONSTRAINT "PromptModuleUse_promptId_fkey" FOREIGN KEY ("promptId") REFERENCES "Prompt" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PromptModuleUse_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Scenario_name_idx" ON "Scenario"("name");

-- CreateIndex
CREATE INDEX "Recipe_scenarioId_idx" ON "Recipe"("scenarioId");

-- CreateIndex
CREATE INDEX "RecipeStep_recipeId_order_idx" ON "RecipeStep"("recipeId", "order");

-- CreateIndex
CREATE INDEX "RecipeStep_moduleId_idx" ON "RecipeStep"("moduleId");

-- CreateIndex
CREATE INDEX "PromptModuleUse_moduleId_idx" ON "PromptModuleUse"("moduleId");
