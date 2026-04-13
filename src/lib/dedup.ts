/**
 * Smart deduplication — finds similar prompts by text similarity.
 * Uses trigram overlap (no external API needed).
 */

import { prisma } from "@/lib/prisma"

interface DuplicateCandidate {
  id: string
  title: string
  similarity: number
}

function trigrams(text: string): Set<string> {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim()
  const grams = new Set<string>()
  for (let i = 0; i <= normalized.length - 3; i++) {
    grams.add(normalized.slice(i, i + 3))
  }
  return grams
}

function trigramSimilarity(a: string, b: string): number {
  const setA = trigrams(a)
  const setB = trigrams(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let intersection = 0
  for (const gram of setA) {
    if (setB.has(gram)) intersection++
  }
  return intersection / Math.max(setA.size, setB.size)
}

const DEDUP_THRESHOLD = 0.4 // 40% trigram overlap = likely similar

/**
 * Find similar prompts by comparing title + first 500 chars of content.
 */
export async function findDuplicates(
  title: string,
  content: string,
  excludeId?: string
): Promise<DuplicateCandidate[]> {
  const prompts = await prisma.prompt.findMany({
    select: { id: true, title: true, content: true },
  })

  const inputText = `${title} ${content.slice(0, 500)}`
  const candidates: DuplicateCandidate[] = []

  for (const p of prompts) {
    if (p.id === excludeId) continue
    const compareText = `${p.title} ${p.content.slice(0, 500)}`
    const similarity = trigramSimilarity(inputText, compareText)
    if (similarity >= DEDUP_THRESHOLD) {
      candidates.push({ id: p.id, title: p.title, similarity })
    }
  }

  return candidates.sort((a, b) => b.similarity - a.similarity).slice(0, 5)
}
