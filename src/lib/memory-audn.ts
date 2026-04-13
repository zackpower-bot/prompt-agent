/**
 * AUDN Materializer — processes MemoryEvents into SemanticMemory.
 *
 * Flow:
 *   1. Pick pending events
 *   2. LLM extracts memory candidate from event content
 *   3. Search similar existing memories
 *   4. LLM decides: Add / Update / Delete / No-op
 *   5. Execute decision, mark event processed
 *
 * State machine: pending → processing → processed | failed
 * Idempotent via contentHash unique constraint on events.
 */

import { prisma } from "@/lib/prisma"
import { createClient, getDefaultProvider, PROVIDER_CONFIGS } from "@/lib/providers"
import { addMemory, searchSimilarMemories, invalidateMemory } from "@/lib/memory"
import type { MemoryType } from "@/types/memory"

const MAX_RETRIES = 3

/**
 * Process a single pending MemoryEvent.
 */
async function processEvent(eventId: string): Promise<void> {
  // Claim the event (pending → processing)
  const event = await prisma.memoryEvent.update({
    where: { id: eventId, status: "pending" },
    data: { status: "processing" },
  }).catch(() => null)

  if (!event) return // Already claimed or not pending

  try {
    // 1. Extract memory candidate via LLM
    const provider = getDefaultProvider()
    const config = PROVIDER_CONFIGS[provider]
    const client = createClient(provider)
    if (!client) throw new Error("No LLM provider available")

    const extractionResponse = await client.chat.completions.create({
      model: config.defaultModel,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content: `You are a memory extraction system. Given a user action event, extract a concise, factual memory statement about the user's preference, behavior, or domain interest. Output ONLY the memory statement in one sentence. If the event is not informative enough to extract a useful memory, output "SKIP".`,
        },
        {
          role: "user",
          content: `Event type: ${event.eventType}\nTrigger: ${event.triggerType}\n\nContent:\n${event.content}`,
        },
      ],
    })

    const extracted = extractionResponse.choices[0]?.message?.content?.trim()
    if (!extracted || extracted === "SKIP") {
      await prisma.memoryEvent.update({
        where: { id: eventId },
        data: { status: "processed", processedAt: new Date(), extractedMemory: null },
      })
      return
    }

    // Save extracted memory on the event
    await prisma.memoryEvent.update({
      where: { id: eventId },
      data: { extractedMemory: extracted },
    })

    // 2. Search similar existing memories
    const similar = await searchSimilarMemories(extracted, { limit: 3, threshold: 0.75 })

    // 3. Determine memory type from event type
    const typeMap: Record<string, MemoryType> = {
      explicit_feedback: "feedback",
      edit_diff: "preference",
      status_change: "feedback",
      reuse_pattern: "behavior",
    }
    const memoryType = typeMap[event.eventType] ?? "preference"

    // 4. AUDN decision
    if (similar.length === 0) {
      // No similar memories → ADD
      await addMemory({
        content: extracted,
        type: memoryType,
        source: "learned",
        confidence: event.triggerType === "thumbs_up" || event.triggerType === "thumbs_down" ? 0.95 : 0.8,
        sourcePromptId: event.sourcePromptId ?? undefined,
        triggerType: event.triggerType,
        reason: "New memory extracted from user action",
        eventId: event.id,
      })
    } else {
      // Has similar memories → ask LLM to decide
      const audnResponse = await client.chat.completions.create({
        model: config.defaultModel,
        temperature: 0.1,
        messages: [
          {
            role: "system",
            content: `You are a memory deduplication system. Compare a new memory candidate with existing memories and decide the action. Output JSON only: { "action": "ADD" | "UPDATE" | "DELETE" | "NOOP", "targetId": "id of memory to update/delete or null", "mergedContent": "merged content if UPDATE, or null" }`,
          },
          {
            role: "user",
            content: `Existing memories:\n${similar.map((m, i) => `${i + 1}. [${m.id}] ${m.content}`).join("\n")}\n\nNew candidate:\n${extracted}`,
          },
        ],
      })

      const raw = audnResponse.choices[0]?.message?.content?.trim() ?? ""
      let decision: { action: string; targetId?: string; mergedContent?: string }
      try {
        decision = JSON.parse(raw.replace(/```json\n?|```/g, ""))
      } catch {
        decision = { action: "ADD" } // Fallback: add if parsing fails
      }

      switch (decision.action) {
        case "UPDATE": {
          const target = decision.targetId
          const merged = decision.mergedContent ?? extracted
          if (target) {
            await invalidateMemory(target, "Superseded by updated memory")
          }
          await addMemory({
            content: merged,
            type: memoryType,
            source: "learned",
            confidence: 0.85,
            sourcePromptId: event.sourcePromptId ?? undefined,
            triggerType: event.triggerType,
            supersedesId: target ?? undefined,
            reason: `Updated from event: ${decision.action}`,
            eventId: event.id,
          })
          break
        }
        case "DELETE": {
          if (decision.targetId) {
            await invalidateMemory(decision.targetId, `Contradicted by new evidence: ${extracted}`)
          }
          break
        }
        case "NOOP":
          break
        case "ADD":
        default:
          await addMemory({
            content: extracted,
            type: memoryType,
            source: "learned",
            confidence: 0.8,
            sourcePromptId: event.sourcePromptId ?? undefined,
            triggerType: event.triggerType,
            reason: "Added as new distinct memory",
            eventId: event.id,
          })
          break
      }
    }

    // Mark processed
    await prisma.memoryEvent.update({
      where: { id: eventId },
      data: { status: "processed", processedAt: new Date() },
    })
  } catch (error) {
    const retryCount = (event?.retryCount ?? 0) + 1
    const newStatus = retryCount >= MAX_RETRIES ? "failed" : "pending"

    await prisma.memoryEvent.update({
      where: { id: eventId },
      data: {
        status: newStatus,
        retryCount,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

/**
 * Process all pending events (batch). Call this periodically or after feedback.
 */
export async function processPendingEvents(limit: number = 10): Promise<number> {
  const events = await prisma.memoryEvent.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  })

  let processed = 0
  for (const event of events) {
    await processEvent(event.id)
    processed++
  }

  return processed
}
