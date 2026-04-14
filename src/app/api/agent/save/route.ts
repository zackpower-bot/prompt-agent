import { NextRequest, NextResponse } from "next/server"
import { createPrompt, saveAgentHistory } from "@/app/actions/prompt.actions"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { content, classification, trajectory, provider, model, userMessage } = body as {
    content: string
    classification?: {
      title?: string
      description?: string
      category?: string
      tags?: string[]
      model?: string
      qualityScore?: number
      riskLevel?: string
    }
    trajectory?: unknown[]
    provider?: string
    model?: string
    userMessage?: string
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const result = await createPrompt({
    title: classification?.title ?? "Untitled Prompt",
    description: classification?.description ?? "",
    content,
    category: classification?.category ?? "general",
    model: classification?.model ?? "universal",
    tags: classification?.tags ?? [],
    qualityScore: classification?.qualityScore,
  })

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  // Save agent history alongside the prompt
  if (trajectory) {
    await saveAgentHistory({
      promptId: result.data.id,
      input: userMessage ?? "",
      output: content,
      trajectory: JSON.stringify(trajectory),
      provider: provider ?? "unknown",
      model: model ?? "unknown",
    })
  }

  return NextResponse.json({ promptId: result.data.id, prompt: result.data })
}
