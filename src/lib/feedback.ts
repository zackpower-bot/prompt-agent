/**
 * Feedback collector — writes MemoryEvents for high-signal user actions.
 * Only these signals qualify:
 *   - Explicit 👍/👎
 *   - Edit diff (> 3 lines changed)
 *   - Status → production
 *   - Reuse pattern (3+ times)
 */

import { createHash } from "node:crypto"
import { prisma } from "@/lib/prisma"
import type { EventType, TriggerType } from "@/types/memory"

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

/**
 * Write a MemoryEvent. Idempotent — duplicate content is silently skipped.
 */
export async function emitMemoryEvent(params: {
  eventType: EventType
  triggerType: TriggerType
  sourcePromptId?: string
  content: string
  metadata?: Record<string, unknown>
}): Promise<string | null> {
  const hash = contentHash(params.content)

  try {
    const event = await prisma.memoryEvent.create({
      data: {
        eventType: params.eventType,
        triggerType: params.triggerType,
        sourcePromptId: params.sourcePromptId,
        content: params.content,
        contentHash: hash,
        metadata: params.metadata ? JSON.stringify(params.metadata) : "{}",
        status: "pending",
      },
    })
    return event.id
  } catch (e) {
    // Unique constraint on contentHash — duplicate, silently skip
    if ((e as { code?: string }).code === "P2002") return null
    throw e
  }
}

/**
 * Emit feedback from explicit rating (👍/👎).
 */
export async function emitExplicitFeedback(params: {
  promptId: string
  rating: "positive" | "negative"
  promptTitle: string
  promptContent: string
}): Promise<void> {
  const isPositive = params.rating === "positive"
  const content = isPositive
    ? `User explicitly approved prompt "${params.promptTitle}". Key characteristics of this prompt: ${params.promptContent.slice(0, 400)}`
    : `User explicitly rejected prompt "${params.promptTitle}". Content that was rejected: ${params.promptContent.slice(0, 400)}`

  await emitMemoryEvent({
    eventType: "explicit_feedback",
    triggerType: isPositive ? "thumbs_up" : "thumbs_down",
    sourcePromptId: params.promptId,
    content,
    metadata: { rating: params.rating },
  })
}

/**
 * Emit feedback from significant edit diff.
 * Only triggers if diff is substantial (> 3 lines changed).
 */
export async function emitEditDiff(params: {
  promptId: string
  promptTitle: string
  before: string
  after: string
}): Promise<void> {
  const beforeLines = params.before.split("\n")
  const afterLines = params.after.split("\n")

  // Simple diff: count lines that differ
  const maxLen = Math.max(beforeLines.length, afterLines.length)
  let diffCount = 0
  for (let i = 0; i < maxLen; i++) {
    if (beforeLines[i] !== afterLines[i]) diffCount++
  }

  // Only emit if substantial change (> 3 lines or > 20% of content)
  const threshold = Math.max(3, Math.floor(maxLen * 0.2))
  if (diffCount < threshold) return

  const content = `User edited prompt "${params.promptTitle}" with ${diffCount} line changes. ` +
    `Before (excerpt): ${params.before.slice(0, 200)}... ` +
    `After (excerpt): ${params.after.slice(0, 200)}...`

  await emitMemoryEvent({
    eventType: "edit_diff",
    triggerType: "edit_save",
    sourcePromptId: params.promptId,
    content,
    metadata: { diffCount, beforeLength: params.before.length, afterLength: params.after.length },
  })
}
