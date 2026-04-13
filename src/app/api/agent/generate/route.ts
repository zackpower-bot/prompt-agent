import { NextRequest, NextResponse } from "next/server"
import { runAgent } from "@/agent/core"
import { getAnalysisTools } from "@/agent/tools"
import { GENERATION_SYSTEM_PROMPT } from "@/agent/prompts"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message, locale = "zh", provider, model } = body as {
    message: string
    locale?: "zh" | "en"
    provider?: string
    model?: string
  }

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 })
  }

  try {
    const result = await runAgent({
      systemPrompt: GENERATION_SYSTEM_PROMPT,
      userMessage: message,
      tools: getAnalysisTools(),
      locale,
      provider: provider as any,
      model,
    })

    return NextResponse.json({
      text: result.text,
      trajectory: result.trajectory,
      provider: result.provider,
      model: result.model,
      usage: result.usage,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
