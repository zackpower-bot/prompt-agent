import { NextRequest, NextResponse } from "next/server"
import { runAgent } from "@/agent/core"
import { buildSystemPrompt } from "@/agent/prompt-builder"
import { ANALYSIS_DEFAULT_CHAIN } from "@/lib/available-models"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MODULE_TYPES = ["role", "goal", "constraint", "output_format", "style", "self_check"]

const EXTRACTION_PROMPT = `Analyze this prompt and identify reusable module fragments.

For each fragment you find, output a JSON array where each item has:
- "type": one of ${MODULE_TYPES.join(", ")}
- "title": a short descriptive title for the module
- "content": the extracted text that could be reused independently

Only extract fragments that are truly reusable across different prompts. Skip if the prompt is too simple.

Output ONLY the JSON array, no other text. If no modules found, output [].

Prompt to analyze:
{content}`

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { content, title } = body as { content: string; title?: string }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  try {
    const systemPrompt = await buildSystemPrompt("analysis", content)

    const result = await runAgent({
      systemPrompt: "You are a module extraction specialist. Identify reusable fragments from prompts. Output only JSON arrays.",
      userMessage: EXTRACTION_PROMPT.replace("{content}", content.slice(0, 3000)),
      locale: "zh",
      maxIterations: 2,
      temperature: 0.1,
      preferredChain: ANALYSIS_DEFAULT_CHAIN,
    })

    // Parse JSON from result
    let suggestions: { type: string; title: string; content: string }[] = []
    try {
      const text = result.text.replace(/```json\n?|```/g, "").trim()
      const parsed = JSON.parse(text)
      if (Array.isArray(parsed)) {
        suggestions = parsed
          .filter((item: any) => item.type && item.title && item.content)
          .filter((item: any) => MODULE_TYPES.includes(item.type))
          .slice(0, 6)
      }
    } catch {
      // Try to find JSON array in the text
      const match = result.text.match(/\[[\s\S]*\]/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          if (Array.isArray(parsed)) {
            suggestions = parsed
              .filter((item: any) => item.type && item.title && item.content)
              .filter((item: any) => MODULE_TYPES.includes(item.type))
              .slice(0, 6)
          }
        } catch {}
      }
    }

    return NextResponse.json({
      suggestions,
      provider: result.provider,
      model: result.model,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
