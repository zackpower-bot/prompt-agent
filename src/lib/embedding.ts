/**
 * Embedding service — locked to a single provider/model.
 * v1: OpenAI text-embedding-3-small (1536 dims).
 * Fallback: Gemini text-embedding-004 if OpenAI key is missing.
 *
 * Every SemanticMemory stores embeddingModel + dimensions so future
 * model changes can trigger re-embedding of stale records.
 */

import OpenAI from "openai"

// MiniMax embo-01 uses non-OpenAI-compatible format (texts[] instead of input),
// so it's excluded from the embedding provider list.
// Priority: OpenAI → Gemini. Both use OpenAI-compatible embedding API.
export const EMBEDDING_CONFIGS = {
  openai: {
    model: "text-embedding-3-small",
    dimensions: 1536,
    baseURL: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
  },
  gemini: {
    model: "text-embedding-004",
    dimensions: 768,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    envKey: "GEMINI_API_KEY",
  },
} as const

export type EmbeddingProvider = keyof typeof EMBEDDING_CONFIGS

function resolveProvider(): EmbeddingProvider | null {
  if (process.env.OPENAI_API_KEY) return "openai"
  if (process.env.GEMINI_API_KEY) return "gemini"
  return null
}

let _client: OpenAI | null = null
let _resolvedProvider: EmbeddingProvider | null = null

function getClient(): { client: OpenAI; provider: EmbeddingProvider } | null {
  const provider = resolveProvider()
  if (!provider) return null

  if (!_client || _resolvedProvider !== provider) {
    const config = EMBEDDING_CONFIGS[provider]
    _client = new OpenAI({
      apiKey: process.env[config.envKey]!,
      baseURL: config.baseURL,
      timeout: 15_000,
    })
    _resolvedProvider = provider
  }

  return { client: _client, provider }
}

export function getEmbeddingMeta(): { model: string; dimensions: number } | null {
  const provider = resolveProvider()
  if (!provider) return null
  const config = EMBEDDING_CONFIGS[provider]
  return { model: config.model, dimensions: config.dimensions }
}

/**
 * Generate embedding for text. Returns Float32Array or null if no provider.
 */
export async function embed(text: string): Promise<Float32Array | null> {
  const resolved = getClient()
  if (!resolved) return null

  const config = EMBEDDING_CONFIGS[resolved.provider]

  const response = await resolved.client.embeddings.create({
    model: config.model,
    input: text.slice(0, 8000),
    dimensions: config.dimensions,
  })

  const data = response.data[0]?.embedding
  if (!data) return null

  return new Float32Array(data)
}

/**
 * Cosine similarity between two Float32Arrays.
 */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

/**
 * Serialize Float32Array to Uint8Array for Prisma Bytes field.
 */
export function float32ToBytes(arr: Float32Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(arr.buffer as ArrayBuffer, arr.byteOffset, arr.byteLength)
}

/**
 * Deserialize Prisma Bytes (Buffer/Uint8Array) back to Float32Array.
 */
export function bytesToFloat32(buf: Buffer | Uint8Array): Float32Array {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4)
}
