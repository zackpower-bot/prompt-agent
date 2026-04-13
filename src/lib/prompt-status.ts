/**
 * Unified prompt status transition.
 * All status changes go through here to ensure consistent side effects.
 */

import { prisma } from "@/lib/prisma"
import { emitMemoryEvent } from "@/lib/feedback"
import type { PromptStatus } from "@/types/memory"

export async function transitionStatus(
  promptId: string,
  to: PromptStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId } })
    if (!prompt) return { success: false, error: "Prompt not found" }

    const from = prompt.status

    await prisma.prompt.update({
      where: { id: promptId },
      data: { status: to },
    })

    // Emit memory event for production transitions
    if (to === "production" && from !== "production") {
      await emitMemoryEvent({
        eventType: "status_change",
        triggerType: "to_production",
        sourcePromptId: promptId,
        content: `Prompt "${prompt.title}" moved to production. Content: ${prompt.content.slice(0, 500)}`,
      })
    }

    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
