"use server"

import { prisma } from "@/lib/prisma"
import { evaluateRecipeHealth, type RecipeHealth } from "@/lib/recipe-health"
import { isValidTemplateType, type TemplateType } from "@/lib/templates"

export interface RecipeStepRecord {
  id: string
  order: number
  moduleId: string | null
  inline: string | null
  module?: { id: string; title: string; content: string; type: string; slot: string | null }
}

export interface RecipeRecord {
  id: string
  scenarioId: string
  name: string
  description: string
  templateType: string | null
  assembled: string | null
  quality: number | null
  createdAt: string
  updatedAt: string
}

export interface RecipeWithSteps extends RecipeRecord {
  steps: RecipeStepRecord[]
}

export interface RecipeWithScenario extends RecipeWithSteps {
  scenario: { id: string; name: string }
}

export interface RecipeListRecord {
  id: string
  name: string
  description: string
  scenarioId: string
  scenarioName: string
  templateType: string | null
  stepCount: number
  health: RecipeHealth
  updatedAt: string
}

type StepInput = { moduleId?: string; inline?: string; order?: number }
type NormalizedStep = { moduleId: string | null; inline: string | null; order: number }

function serializeRecipe(row: any): RecipeRecord {
  return {
    id: row.id,
    scenarioId: row.scenarioId,
    name: row.name,
    description: row.description,
    templateType: row.templateType ?? null,
    assembled: row.assembled ?? null,
    quality: row.quality ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function serializeStep(row: any): RecipeStepRecord {
  return {
    id: row.id,
    order: row.order,
    moduleId: row.moduleId ?? null,
    inline: row.inline ?? null,
    module: row.module
      ? {
          id: row.module.id,
          title: row.module.title,
          content: row.module.content,
          type: row.module.type,
          slot: row.module.slot ?? null,
        }
      : undefined,
  }
}

function serializeRecipeWithSteps(row: any): RecipeWithSteps {
  return {
    ...serializeRecipe(row),
    steps: (row.steps ?? []).map(serializeStep),
  }
}

function serializeRecipeWithScenario(row: any): RecipeWithScenario {
  return {
    ...serializeRecipeWithSteps(row),
    scenario: {
      id: row.scenario.id,
      name: row.scenario.name,
    },
  }
}

function toRecipeHealth(row: any): RecipeHealth {
  return evaluateRecipeHealth({
    templateType: row.templateType ?? null,
    steps: (row.steps ?? []).map((step: any) => ({
      moduleSlot: step.module?.slot ?? null,
      isInline: Boolean(step.inline),
    })),
  })
}

function serializeRecipeListRecord(row: any): RecipeListRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scenarioId: row.scenarioId,
    scenarioName: row.scenario?.name ?? "",
    templateType: row.templateType ?? null,
    stepCount: row._count?.steps ?? row.steps?.length ?? 0,
    health: toRecipeHealth(row),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function normalizeSteps(steps?: StepInput[]): NormalizedStep[] {
  if (!steps?.length) return []
  return steps.map((step, index) => ({
    moduleId: step.moduleId ?? null,
    inline: step.inline ?? null,
    order: step.order ?? index,
  }))
}

export async function createRecipe(input: {
  scenarioId: string
  name: string
  description?: string
  templateType?: TemplateType | null
  steps?: StepInput[]
}): Promise<{ success: true; data: RecipeWithSteps } | { success: false; error: string }> {
  try {
    const normalizedSteps = normalizeSteps(input.steps)
    const row = await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          scenarioId: input.scenarioId,
          name: input.name,
          description: input.description ?? "",
          templateType: input.templateType ?? null,
        },
      })
      if (normalizedSteps.length) {
        await tx.recipeStep.createMany({
          data: normalizedSteps.map((step) => ({
            recipeId: recipe.id,
            order: step.order,
            moduleId: step.moduleId,
            inline: step.inline,
          })),
        })
      }
      return tx.recipe.findUnique({
        where: { id: recipe.id },
        include: {
          steps: {
            orderBy: { order: "asc" },
            include: { module: true },
          },
        },
      })
    })
    if (!row) throw new Error("Recipe not found after creation")
    return { success: true, data: serializeRecipeWithSteps(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateRecipe(
  id: string,
  input: Partial<{ name: string; description: string; templateType: TemplateType | null; steps: StepInput[] }>
): Promise<{ success: true; data: RecipeWithSteps } | { success: false; error: string }> {
  try {
    const normalizedSteps = normalizeSteps(input.steps)
    const row = await prisma.$transaction(async (tx) => {
      if (
        input.name !== undefined ||
        input.description !== undefined ||
        input.templateType !== undefined
      ) {
        await tx.recipe.update({
          where: { id },
          data: {
            ...(input.name !== undefined && { name: input.name }),
            ...(input.description !== undefined && { description: input.description }),
            ...(input.templateType !== undefined && { templateType: input.templateType }),
          },
        })
      }
      if (input.steps !== undefined) {
        await tx.recipeStep.deleteMany({ where: { recipeId: id } })
        if (normalizedSteps.length) {
          await tx.recipeStep.createMany({
            data: normalizedSteps.map((step) => ({
              recipeId: id,
              order: step.order,
              moduleId: step.moduleId,
              inline: step.inline,
            })),
          })
        }
      }
      return tx.recipe.findUnique({
        where: { id },
        include: {
          steps: {
            orderBy: { order: "asc" },
            include: { module: true },
          },
        },
      })
    })
    if (!row) return { success: false, error: "Recipe not found" }
    return { success: true, data: serializeRecipeWithSteps(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getRecipesByScenario(
  scenarioId: string
): Promise<{ success: true; data: RecipeWithSteps[] } | { success: false; error: string }> {
  try {
    const rows = await prisma.recipe.findMany({
      where: { scenarioId },
      orderBy: { updatedAt: "desc" },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { module: true },
        },
      },
    })
    return { success: true, data: rows.map(serializeRecipeWithSteps) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getRecipeById(
  id: string
): Promise<{ success: true; data: RecipeWithScenario } | { success: false; error: string }> {
  try {
    const row = await prisma.recipe.findUnique({
      where: { id },
      include: {
        scenario: { select: { id: true, name: true } },
        steps: {
          orderBy: { order: "asc" },
          include: { module: true },
        },
      },
    })
    if (!row) return { success: false, error: "Recipe not found" }
    return { success: true, data: serializeRecipeWithScenario(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getAllRecipes(filters?: {
  templateType?: string
  limit?: number
  offset?: number
}): Promise<{ success: true; data: RecipeListRecord[]; total: number } | { success: false; error: string }> {
  try {
    const where: any = {}
    if (filters?.templateType && isValidTemplateType(filters.templateType)) {
      where.templateType = filters.templateType
    }

    const [rows, total] = await Promise.all([
      prisma.recipe.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        take: filters?.limit ?? 50,
        skip: filters?.offset ?? 0,
        include: {
          scenario: { select: { name: true } },
          _count: { select: { steps: true } },
          steps: {
            include: {
              module: { select: { slot: true } },
            },
          },
        },
      }),
      prisma.recipe.count({ where }),
    ])

    return { success: true, data: rows.map(serializeRecipeListRecord), total }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function deleteRecipe(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.recipe.delete({ where: { id } })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function assembleRecipe(
  id: string
): Promise<{ success: true; data: { assembled: string } } | { success: false; error: string }> {
  try {
    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { order: "asc" },
          include: { module: { select: { content: true } } },
        },
      },
    })
    if (!recipe) return { success: false, error: "Recipe not found" }
    const parts = recipe.steps.map((step) => step.inline ?? step.module?.content ?? "").filter((part) => part.trim().length)
    const assembled = parts.join("\n\n")
    await prisma.recipe.update({
      where: { id },
      data: { assembled },
    })
    return { success: true, data: { assembled } }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
