import { NextRequest } from "next/server"
import { runAgent } from "@/agent/core"
import type { AgentTrajectoryStep } from "@/agent/core"
import { getAnalysisTools } from "@/agent/tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const SYSTEM_PROMPT = `You are a Prompt Engineering Agent. Your job is to help users create, analyze, and optimize prompts.

When the user provides an idea or topic:
1. Use search_modules to check for existing reusable modules in the library.
2. Optionally use web_search to gather domain-specific context if the topic requires external knowledge.
3. Generate a complete, well-structured prompt with:
   - Clear role definition
   - Specific constraints and guidelines
   - Output format specification
   - Example usage if appropriate
4. Use classify_prompt to output the final classification (title, description, category, tags, quality score).

Always think step by step. Output the final prompt in markdown format.`

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message, locale = "zh", provider, model } = body as {
    message: string
    locale?: "zh" | "en"
    provider?: string
    model?: string
  }

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send("status", { status: "running" })

        const result = await runAgent({
          systemPrompt: SYSTEM_PROMPT,
          userMessage: message,
          tools: getAnalysisTools(),
          locale,
          provider: provider as any,
          model,
          onStep: (step: AgentTrajectoryStep) => {
            send("step", step)
          },
        })

        send("result", {
          text: result.text,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
          trajectoryCount: result.trajectory.length,
        })

        send("done", { ok: true })
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error"
        send("error", { message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
