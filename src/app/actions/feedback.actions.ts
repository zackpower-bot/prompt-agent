"use server"

import { emitExplicitFeedback } from "@/lib/feedback"
import { prisma } from "@/lib/prisma"

export async function submitFeedback(
  promptId: string,
  rating: "positive" | "negative"
): Promise<{ success: boolean; error?: string }> {
  try {
    const prompt = await prisma.prompt.findUnique({ where: { id: promptId, deletedAt: null } })
    if (!prompt) return { success: false, error: "Prompt not found" }

    await emitExplicitFeedback({
      promptId,
      rating,
      promptTitle: prompt.title,
      promptContent: prompt.content,
    })

    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
