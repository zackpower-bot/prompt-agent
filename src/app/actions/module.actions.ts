"use server"

import type { Prisma } from "@/generated/prisma/client"
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

const moduleWithTagsInclude = {
  tags: {
    include: { tag: true },
  },
} as const

type TxClient = Prisma.TransactionClient
type TagRecord = { id: string; name: string }

function serializeModule(row: any): ModuleWithMeta {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    tags: Array.isArray(row.tags) ? row.tags.map((t: any) => t.tag?.name ?? "").filter(Boolean) : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function normalizeTagNames(tags?: string[]) {
  if (!tags) return []
  const seen = new Set<string>()
  for (const raw of tags) {
    const trimmed = raw?.trim()
    if (trimmed && !seen.has(trimmed)) seen.add(trimmed)
  }
  return Array.from(seen)
}

async function upsertTags(tx: TxClient, tagNames: string[]): Promise<TagRecord[]> {
  if (!tagNames.length) return []
  return Promise.all(
    tagNames.map((name) =>
      tx.tag.upsert({
        where: { name },
        create: { name },
        update: {},
      })
    )
  )
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
    const rows = await prisma.module.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: moduleWithTagsInclude,
    })
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
    const tagNames = normalizeTagNames(input.tags)
    const row = await prisma.$transaction(async (tx) => {
      const tags = await upsertTags(tx, tagNames)
      return tx.module.create({
        data: {
          title: input.title,
          content: input.content,
          type: input.type,
          tags: tags.length
            ? {
                create: tags.map((tag) => ({
                  tag: { connect: { id: tag.id } },
                })),
              }
            : undefined,
        },
        include: moduleWithTagsInclude,
      })
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
    const row = await prisma.$transaction(async (tx) => {
      const data: Prisma.ModuleUpdateInput = {}
      if (input.title !== undefined) data.title = input.title
      if (input.content !== undefined) data.content = input.content
      if (input.type !== undefined) data.type = input.type

      if (Object.keys(data).length) {
        await tx.module.update({ where: { id }, data })
      }

      if (input.tags !== undefined) {
        const tagNames = normalizeTagNames(input.tags)
        const tags = await upsertTags(tx, tagNames)
        await tx.moduleTag.deleteMany({ where: { moduleId: id } })
        if (tags.length) {
          await tx.moduleTag.createMany({
            data: tags.map((tag) => ({ moduleId: id, tagId: tag.id })),
          })
        }
      }

      const module = await tx.module.findUnique({
        where: { id },
        include: moduleWithTagsInclude,
      })
      if (!module) throw new Error("Module not found")
      return module
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
