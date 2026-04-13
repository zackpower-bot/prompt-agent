"use server"

import { prisma } from "@/lib/prisma"

export interface CreatePromptInput {
  title: string
  description: string
  content: string
  category?: string
  model?: string
  status?: string
  tags?: string[]
}

export interface PromptWithTags {
  id: string
  title: string
  description: string
  content: string
  category: string
  model: string
  status: string
  isFavorite: boolean
  lastUsedAt: string | null
  createdAt: string
  updatedAt: string
  tags: string[]
}

function serializePrompt(row: any): PromptWithTags {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    content: row.content,
    category: row.category,
    model: row.model,
    status: row.status,
    isFavorite: row.isFavorite,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    tags: row.tags?.map((pt: any) => pt.tag.name) ?? [],
  }
}

export async function createPrompt(
  input: CreatePromptInput
): Promise<{ success: true; data: PromptWithTags } | { success: false; error: string }> {
  try {
    const tagNames = (input.tags ?? []).map(t => t.trim().toLowerCase()).filter(Boolean)

    // Upsert tags
    const tagRecords = await Promise.all(
      tagNames.map(name =>
        prisma.tag.upsert({
          where: { name },
          update: {},
          create: { name },
        })
      )
    )

    const row = await prisma.prompt.create({
      data: {
        title: input.title,
        description: input.description,
        content: input.content,
        category: input.category ?? "general",
        model: input.model ?? "universal",
        status: input.status ?? "inbox",
        tags: {
          create: tagRecords.map(tag => ({
            tag: { connect: { id: tag.id } },
          })),
        },
      },
      include: { tags: { include: { tag: true } } },
    })

    return { success: true, data: serializePrompt(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getPromptsPaginated(
  page: number = 1,
  pageSize: number = 20,
  filters?: { search?: string; category?: string; tag?: string; status?: string }
): Promise<
  | { success: true; data: { prompts: PromptWithTags[]; total: number; page: number; pageSize: number } }
  | { success: false; error: string }
> {
  try {
    const where: any = {}
    const andClauses: any[] = []

    if (filters?.status && filters.status !== "all") {
      where.status = filters.status
    }
    if (filters?.category && filters.category !== "all") {
      where.category = filters.category
    }
    if (filters?.tag && filters.tag !== "all") {
      andClauses.push({
        tags: { some: { tag: { name: filters.tag } } },
      })
    }
    if (filters?.search) {
      const q = filters.search
      andClauses.push({
        OR: [
          { title: { contains: q } },
          { description: { contains: q } },
          { content: { contains: q } },
        ],
      })
    }
    if (andClauses.length) where.AND = andClauses

    const skip = (page - 1) * pageSize
    const [rows, total] = await Promise.all([
      prisma.prompt.findMany({
        where,
        include: { tags: { include: { tag: true } } },
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
      prisma.prompt.count({ where }),
    ])

    return {
      success: true,
      data: {
        prompts: rows.map(serializePrompt),
        total,
        page,
        pageSize,
      },
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getAllTags(): Promise<
  { success: true; data: string[] } | { success: false; error: string }
> {
  try {
    const tags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      where: { prompts: { some: {} } },
    })
    return { success: true, data: tags.map(t => t.name) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function getPromptById(id: string): Promise<{ success: true; data: PromptWithTags } | { success: false; error: string }> {
  try {
    const row = await prisma.prompt.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    })
    if (!row) return { success: false, error: "Prompt not found" }
    return { success: true, data: serializePrompt(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function updatePrompt(
  id: string,
  input: Partial<CreatePromptInput> & { status?: string }
): Promise<{ success: true; data: PromptWithTags } | { success: false; error: string }> {
  try {
    const existing = await prisma.prompt.findUnique({ where: { id } })
    if (!existing) return { success: false, error: "Prompt not found" }

    // Handle tag updates if provided
    if (input.tags) {
      // Remove existing tags
      await prisma.promptTag.deleteMany({ where: { promptId: id } })
      // Upsert and connect new tags
      const tagRecords = await Promise.all(
        input.tags.map(name => prisma.tag.upsert({
          where: { name: name.trim().toLowerCase() },
          update: {},
          create: { name: name.trim().toLowerCase() },
        }))
      )
      await prisma.promptTag.createMany({
        data: tagRecords.map(tag => ({ promptId: id, tagId: tag.id })),
      })
    }

    const row = await prisma.prompt.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.model !== undefined && { model: input.model }),
        ...(input.status !== undefined && { status: input.status }),
      },
      include: { tags: { include: { tag: true } } },
    })

    return { success: true, data: serializePrompt(row) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function deletePrompt(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.prompt.delete({ where: { id } })
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function archivePrompt(id: string): Promise<{ success: true; data: PromptWithTags } | { success: false; error: string }> {
  return updatePrompt(id, { status: "archived" })
}

export async function getPromptsForCleanup(
  limit: number = 50
): Promise<{ success: true; data: PromptWithTags[] } | { success: false; error: string }> {
  try {
    // Get prompts that likely need cleanup: single tag, no description, or status "inbox"
    const rows = await prisma.prompt.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "asc" }, // oldest first
      take: limit,
    })
    return { success: true, data: rows.map(serializePrompt) }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

export async function saveAgentHistory(data: {
  promptId: string
  type?: string
  input: string
  output: string
  trajectory: string
  provider: string
  model: string
}): Promise<{ success: boolean }> {
  try {
    await prisma.agentHistory.create({
      data: {
        promptId: data.promptId,
        type: data.type ?? "react_trajectory",
        input: data.input,
        output: data.output,
        trajectory: data.trajectory,
        provider: data.provider,
        model: data.model,
      },
    })
    return { success: true }
  } catch {
    return { success: false }
  }
}
