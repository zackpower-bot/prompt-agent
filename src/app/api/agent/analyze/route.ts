import { NextRequest, NextResponse } from "next/server"
import { runAgent } from "@/agent/core"
import { getAnalysisTools } from "@/agent/tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const ANALYSIS_PROMPT = `You are a Prompt Quality Analyst. Analyze the following prompt and use the classify_prompt tool to output your classification.

Evaluate:
- Is the title clear and descriptive?
- Does it have a good description?
- Are the tags comprehensive?
- What category fits best?
- Rate quality 0-1 (consider: structure, clarity, specificity, reusability)

Prompt to analyze:
Title: {title}
Current tags: {tags}
Current category: {category}
Content:
{content}`

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { id, title, content, tags, category } = body as {
    id: string
    title: string
    content: string
    tags: string[]
    category: string
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

    const result = await runAgent({
      systemPrompt: "You are a Prompt Quality Analyst. Use the classify_prompt tool to output your analysis. Be concise.",
      userMessage,
      tools: getAnalysisTools(),
      locale: "zh",
      maxIterations: 4,
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
