import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { embed, bytesToFloat32Array, cosineSimilarity } from "@/lib/embedding"

const DEFAULT_TOP_K = 5
const MAX_TOP_K = 20

type SuggestRequest = {
  description?: string
  topK?: number
}

type SuggestMatch = {
  scenario: {
    id: string
    name: string
    description: string
    similarity: number
  }
  recipes: Array<{
    id: string
    name: string
    description: string
    quality: number | null
  }>
}

type SuggestResponseBody = {
  query: { description: string; hasEmbedding: boolean }
  matches: SuggestMatch[]
}

function normalizeTopK(topK?: number): number {
  if (typeof topK !== "number" || !Number.isFinite(topK)) return DEFAULT_TOP_K
  const clamped = Math.min(Math.max(Math.floor(topK), 1), MAX_TOP_K)
  return clamped || DEFAULT_TOP_K
}

export async function POST(req: Request) {
  let payload: SuggestRequest
  try {
    payload = (await req.json()) as SuggestRequest
  } catch {
    payload = {}
  }
  const description = (payload.description ?? "").trim()
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 })
  }
  const topK = normalizeTopK(payload.topK)

  const queryVector = await embed(description)
  if (!queryVector) {
    const body: SuggestResponseBody = {
      query: { description, hasEmbedding: false },
      matches: [],
    }
    return NextResponse.json(body)
  }

  const scenarios = await prisma.scenario.findMany({
    where: { embedding: { not: null } },
    select: {
      id: true,
      name: true,
      description: true,
      embedding: true,
      recipes: {
        select: { id: true, name: true, description: true, quality: true },
        orderBy: { updatedAt: "desc" },
      },
    },
  })

  if (!scenarios.length) {
    const body: SuggestResponseBody = {
      query: { description, hasEmbedding: true },
      matches: [],
    }
    return NextResponse.json(body)
  }

  const matches = scenarios
    .map<SuggestMatch | null>((scenario) => {
      if (!scenario.embedding) return null
      const vector = bytesToFloat32Array(scenario.embedding as Buffer)
      const similarity = cosineSimilarity(queryVector, vector)
      const normalized = Number.isFinite(similarity) ? Math.max(0, Math.min(1, similarity)) : 0
      return {
        scenario: {
          id: scenario.id,
          name: scenario.name,
          description: scenario.description,
          similarity: normalized,
        },
        recipes: scenario.recipes.map((recipe) => ({
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          quality: recipe.quality ?? null,
        })),
      }
    })
    .filter((match): match is SuggestMatch => Boolean(match))
    .sort((a, b) => b.scenario.similarity - a.scenario.similarity)
    .slice(0, topK)

  const body: SuggestResponseBody = {
    query: { description, hasEmbedding: true },
    matches,
  }
  return NextResponse.json(body)
}
