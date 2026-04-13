"use server"

import { prisma } from "@/lib/prisma"

export interface ModuleWithMeta {
  id: string
  title: string
  content: string
  type: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

function serializeModule(row: any): ModuleWithMeta {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    tags: JSON.parse(row.tags || "[]"),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function getModules(filters?: {
  type?: string
  search?: string
}): Promise<{ success: true; data: ModuleWithMeta[] } | { success: false; error: string }> {
  try {
    const where: any = {}
    if (filters?.type && filters.type !== "all") where.type = filters.type
    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search } },
        { content: { contains: filters.search } },
      ]
    }
    const rows = await prisma.module.findMany({ where, orderBy: { updatedAt: "desc" } })
    return { success: true, data: rows.map(serializeModule) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function createModule(input: {
  title: string
  content: string
  type: string
  tags?: string[]
}): Promise<{ success: true; data: ModuleWithMeta } | { success: false; error: string }> {
  try {
    const row = await prisma.module.create({
      data: {
        title: input.title,
        content: input.content,
        type: input.type,
        tags: JSON.stringify(input.tags ?? []),
      },
    })
    return { success: true, data: serializeModule(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updateModule(
  id: string,
  input: Partial<{ title: string; content: string; type: string; tags: string[] }>
): Promise<{ success: true; data: ModuleWithMeta } | { success: false; error: string }> {
  try {
    const row = await prisma.module.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.tags !== undefined && { tags: JSON.stringify(input.tags) }),
      },
    })
    return { success: true, data: serializeModule(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function deleteModule(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.module.delete({ where: { id } })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
