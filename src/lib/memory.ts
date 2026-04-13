/**
 * Memory storage and retrieval layer.
 * Handles SemanticMemory CRUD + cosine similarity search.
 */

import { prisma } from "@/lib/prisma"
import { embed, cosineSimilarity, float32ToBytes, bytesToFloat32, getEmbeddingMeta } from "@/lib/embedding"
import type { MemoryType } from "@/types/memory"
import { DECAY_FACTORS, MIN_CONFIDENCE, RETRIEVAL_BUDGET, AUDN_SIMILARITY_THRESHOLD } from "@/types/memory"

export interface MemoryRecord {
  id: string
  content: string
  type: MemoryType
  source: string
  confidence: number
  sourcePromptId: string | null
  triggerType: string | null
  supersedesId: string | null
  reason: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RankedMemory extends MemoryRecord {
  similarity: number
  effectiveConfidence: number
}

/**
 * Add a new semantic memory with embedding.
 */
export async function addMemory(params: {
  content: string
  type: MemoryType
  source?: string
  confidence?: number
  sourcePromptId?: string
  triggerType?: string
  supersedesId?: string
  reason?: string
  eventId?: string
}): Promise<string | null> {
  const meta = getEmbeddingMeta()
  if (!meta) return null

  const vec = await embed(params.content)
  if (!vec) return null

  const record = await prisma.semanticMemory.create({
    data: {
      content: params.content,
      embedding: float32ToBytes(vec),
      embeddingModel: meta.model,
      dimensions: meta.dimensions,
      type: params.type,
      source: params.source ?? "learned",
      confidence: params.confidence ?? 0.8,
      sourcePromptId: params.sourcePromptId,
      triggerType: params.triggerType,
      supersedesId: params.supersedesId,
      reason: params.reason,
      eventId: params.eventId,
    },
  })

  // If this supersedes another memory, mark the old one
  if (params.supersedesId) {
    await prisma.semanticMemory.update({
      where: { id: params.supersedesId },
      data: { supersededById: record.id },
    }).catch(() => {})
  }

  return record.id
}

/**
 * Invalidate a memory (soft delete via supersededById).
 */
export async function invalidateMemory(id: string, reason: string, supersededById?: string): Promise<void> {
  await prisma.semanticMemory.update({
    where: { id },
    data: {
      supersededById: supersededById ?? "INVALIDATED",
      reason,
      confidence: 0,
    },
  })
}

/**
 * Search for similar memories. Returns top-k ranked by cosine similarity.
 */
export async function searchSimilarMemories(
  text: string,
  options?: {
    type?: MemoryType
    limit?: number
    threshold?: number
    excludePromptId?: string
  }
): Promise<RankedMemory[]> {
  const vec = await embed(text)
  if (!vec) return []

  const threshold = options?.threshold ?? AUDN_SIMILARITY_THRESHOLD
  const limit = options?.limit ?? 5

  // Load active memories (not superseded, above min confidence)
  const where: Record<string, unknown> = {
    supersededById: null,
    confidence: { gt: 0 },
  }
  if (options?.type) where.type = options.type

  const rows = await prisma.semanticMemory.findMany({ where })

  const now = new Date()
  const ranked: RankedMemory[] = []

  for (const row of rows) {
    // Skip memories from excluded prompt (prevent circular reinforcement)
    if (options?.excludePromptId && row.sourcePromptId === options.excludePromptId) {
      const daysSinceCreation = (now.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreation < 7) continue // Only exclude recent memories from same prompt
    }

    const stored = bytesToFloat32(row.embedding as Buffer)
    const similarity = cosineSimilarity(vec, stored)
    if (similarity < threshold) continue

    // Apply decay
    const daysSinceUpdate = (now.getTime() - row.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    const decayFactor = DECAY_FACTORS[row.type as MemoryType] ?? 0.995
    const effectiveConfidence = row.confidence * Math.pow(decayFactor, daysSinceUpdate)

    if (effectiveConfidence < MIN_CONFIDENCE) continue

    ranked.push({
      id: row.id,
      content: row.content,
      type: row.type as MemoryType,
      source: row.source,
      confidence: row.confidence,
      sourcePromptId: row.sourcePromptId,
      triggerType: row.triggerType,
      supersedesId: row.supersedesId,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      similarity,
      effectiveConfidence,
    })
  }

  // Sort by similarity × effective confidence
  ranked.sort((a, b) => b.similarity * b.effectiveConfidence - a.similarity * a.effectiveConfidence)

  return ranked.slice(0, limit)
}

/**
 * Retrieve memories for system prompt injection, respecting per-type budgets.
 * Returns memories grouped by type, ready for formatting.
 */
export async function retrieveForPrompt(
  userInput: string,
  excludePromptId?: string
): Promise<Record<MemoryType, RankedMemory[]>> {
  const result: Record<MemoryType, RankedMemory[]> = {
    preference: [],
    behavior: [],
    domain: [],
    feedback: [],
  }

  const vec = await embed(userInput)
  if (!vec) return result

  // Load all active memories
  const rows = await prisma.semanticMemory.findMany({
    where: { supersededById: null, confidence: { gt: 0 } },
  })

  const now = new Date()
  const all: RankedMemory[] = []

  for (const row of rows) {
    if (excludePromptId && row.sourcePromptId === excludePromptId) {
      const days = (now.getTime() - row.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (days < 7) continue
    }

    const stored = bytesToFloat32(row.embedding as Buffer)
    const similarity = cosineSimilarity(vec, stored)
    const daysSinceUpdate = (now.getTime() - row.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    const decayFactor = DECAY_FACTORS[row.type as MemoryType] ?? 0.995
    const effectiveConfidence = row.confidence * Math.pow(decayFactor, daysSinceUpdate)

    if (effectiveConfidence < MIN_CONFIDENCE) continue

    all.push({
      id: row.id,
      content: row.content,
      type: row.type as MemoryType,
      source: row.source,
      confidence: row.confidence,
      sourcePromptId: row.sourcePromptId,
      triggerType: row.triggerType,
      supersedesId: row.supersedesId,
      reason: row.reason,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      similarity,
      effectiveConfidence,
    })
  }

  // Distribute into type buckets with per-type budget
  for (const type of Object.keys(RETRIEVAL_BUDGET) as MemoryType[]) {
    const bucket = all
      .filter((m) => m.type === type)
      .sort((a, b) => b.similarity * b.effectiveConfidence - a.similarity * a.effectiveConfidence)
      .slice(0, RETRIEVAL_BUDGET[type])
    result[type] = bucket
  }

  return result
}

/**
 * Validate (reinforce) a memory — bumps confidence and refreshes timestamp.
 */
export async function validateMemory(id: string): Promise<void> {
  const row = await prisma.semanticMemory.findUnique({ where: { id } })
  if (!row) return

  await prisma.semanticMemory.update({
    where: { id },
    data: {
      confidence: Math.min(row.confidence + 0.1, 1.0),
      lastValidatedAt: new Date(),
    },
  })
}
