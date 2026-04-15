import { NextRequest, NextResponse } from "next/server"
import { runAgent } from "@/agent/core"
import { getAnalysisTools } from "@/agent/tools"
import { buildSystemPrompt } from "@/agent/prompt-builder"
import type { ProviderName } from "@/lib/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ANALYSIS_PROMPT = `Analyze the following prompt and use the classify_prompt tool to output your classification.

Prompt to analyze:
Title: {title}
Current tags: {tags}
Current category: {category}
Content:
{content}`

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id, title, content, tags, category, preferredChain } = body as {
    id: string
    title: string
    content: string
    tags: string[]
    category: string
    preferredChain?: Array<{ provider: string; model?: string }>
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  try {
    const userMessage = ANALYSIS_PROMPT
      .replace("{title}", title)
      .replace("{tags}", tags.join(", ") || "none")
      .replace("{category}", category)
      .replace("{content}", content.slice(0, 2000))

    const systemPrompt = await buildSystemPrompt("analysis", userMessage, { excludePromptId: id })

    const result = await runAgent({
      systemPrompt,
      userMessage,
      tools: getAnalysisTools(),
      locale: "zh",
      maxIterations: 4,
      preferredChain: preferredChain as Array<{ provider: ProviderName; model?: string }> | undefined,
    })

    // Extract classification from trajectory
    let classification: Record<string, unknown> = {}
    for (const step of result.trajectory) {
      if (step.tool === "classify_prompt" && step.phase === "observation") {
        try { classification = JSON.parse(step.content) } catch {}
      }
    }

    return NextResponse.json({
      id,
      classification,
      text: result.text,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg, id }, { status: 500 })
  }
}
