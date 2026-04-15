"use server"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { embedScenarioAsync } from "@/lib/embedding"

export interface ScenarioRecord {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  recipeCount: number
}

export interface ScenarioWithRecipes extends ScenarioRecord {
  recipes: { id: string; name: string; description: string; quality: number | null; updatedAt: string }[]
}

function serializeScenario(row: {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
  _count?: { recipes: number }
  recipes?: { id: string }[]
}): ScenarioRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    recipeCount: row._count?.recipes ?? row.recipes?.length ?? 0,
  }
}

function serializeScenarioWithRecipes(row: any): ScenarioWithRecipes {
  return {
    ...serializeScenario(row),
    recipes: (row.recipes ?? []).map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      quality: recipe.quality ?? null,
      updatedAt: recipe.updatedAt.toISOString(),
    })),
  }
}

export async function createScenario(input: {
  name: string
  description?: string
}): Promise<{ success: true; data: ScenarioRecord } | { success: false; error: string }> {
  try {
    const row = await prisma.scenario.create({
      data: {
        name: input.name,
        description: input.description ?? "",
      },
    })
    void embedScenarioAsync(row.id)
    return { success: true, data: serializeScenario(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateScenario(
  id: string,
  input: Partial<{ name: string; description: string }>
): Promise<{ success: true; data: ScenarioRecord } | { success: false; error: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.scenario.findUnique({
        where: { id },
        select: { id: true, name: true, description: true },
      })
      if (!existing) throw new Error("Scenario not found")

      let shouldEmbed = false
      if (input.name !== undefined && input.name !== existing.name) shouldEmbed = true
      if (input.description !== undefined && input.description !== existing.description) shouldEmbed = true

      const data: Partial<{ name: string; description: string }> = {}
      if (input.name !== undefined) data.name = input.name
      if (input.description !== undefined) data.description = input.description
      if (Object.keys(data).length) {
        await tx.scenario.update({ where: { id }, data })
      }
      const scenario = await tx.scenario.findUnique({ where: { id } })
      if (!scenario) throw new Error("Scenario not found")
      return { scenario, shouldEmbed }
    })
    if (result.shouldEmbed) void embedScenarioAsync(result.scenario.id)
    return { success: true, data: serializeScenario(result.scenario) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getScenarios(filters?: {
  search?: string
}): Promise<{ success: true; data: ScenarioRecord[] } | { success: false; error: string }> {
  try {
    const where: any = {}
    if (filters?.search) {
      const search = filters.search
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }]
    }
    const rows = await prisma.scenario.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { recipes: true } },
      },
    })
    return { success: true, data: rows.map(serializeScenario) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getScenariosPaginated(params?: {
  search?: string
  limit?: number
  offset?: number
}): Promise<
  | { success: true; data: ScenarioRecord[]; total: number; limit: number; offset: number }
  | { success: false; error: string }
> {
  try {
    const where: Prisma.ScenarioWhereInput = {}
    if (params?.search) {
      const search = params.search
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }]
    }

    const limit = params?.limit ?? 50
    const offset = params?.offset ?? 0

    const [rows, total] = await Promise.all([
      prisma.scenario.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { recipes: true } },
        },
        take: limit,
        skip: offset,
      }),
      prisma.scenario.count({ where }),
    ])

    return {
      success: true,
      data: rows.map(serializeScenario),
      total,
      limit,
      offset,
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getScenarioById(id: string): Promise<
  { success: true; data: ScenarioWithRecipes } | { success: false; error: string }
> {
  try {
    const row = await prisma.scenario.findUnique({
      where: { id },
      include: {
        recipes: {
          select: { id: true, name: true, description: true, quality: true, updatedAt: true },
          orderBy: { updatedAt: "desc" },
        },
      },
    })
    if (!row) return { success: false, error: "Scenario not found" }
    return { success: true, data: serializeScenarioWithRecipes(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function deleteScenario(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.scenario.delete({ where: { id } })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
