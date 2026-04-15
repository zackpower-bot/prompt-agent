import { bytesToFloat32Array, cosineSimilarity, embed } from "@/lib/embedding"
import { prisma } from "@/lib/prisma"
import type { Slot } from "@/lib/slots"

export interface RetrievedModule {
  id: string
  title: string
  type: string | null
  slot: Slot | null
  contentPreview: string
  similarity: number
}

export interface RetrievalResult {
  hasEmbedding: boolean
  modules: RetrievedModule[]
  bySlot: Record<string, RetrievedModule[]>
}

export async function retrieveModulesForGoal(goal: string, topK = 10): Promise<RetrievalResult> {
  const queryVector = await embed(goal)
  if (!queryVector) {
    return { hasEmbedding: false, modules: [], bySlot: {} }
  }

  const candidates = await prisma.module.findMany({
    where: { deletedAt: null, embedding: { not: null } },
    select: { id: true, title: true, type: true, slot: true, content: true, embedding: true },
  })

  const ranked: RetrievedModule[] = []

  for (const module of candidates) {
    if (!module.embedding) continue
    const vector = bytesToFloat32Array(module.embedding)
    const similarity = cosineSimilarity(queryVector, vector)
    const normalized = Number.isFinite(similarity) ? Math.max(0, Math.min(1, similarity)) : 0

    ranked.push({
      id: module.id,
      title: module.title,
      type: module.type ?? null,
      slot: (module.slot as Slot | null) ?? null,
      contentPreview: module.content.slice(0, 120),
      similarity: normalized,
    })
  }

  ranked.sort((a, b) => b.similarity - a.similarity)

  const modules = ranked.slice(0, topK)
  const bySlot: Record<string, RetrievedModule[]> = {}

  for (const module of modules) {
    const key = module.slot ?? "_unclassified"
    if (!bySlot[key]) bySlot[key] = []
    bySlot[key].push(module)
  }

  return { hasEmbedding: true, modules, bySlot }
}
