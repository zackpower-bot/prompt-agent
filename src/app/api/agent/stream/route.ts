import { NextRequest } from "next/server"
import { runAgent } from "@/agent/core"
import type { AgentTrajectoryStep } from "@/agent/core"
import { getAnalysisTools } from "@/agent/tools"
import { buildSystemPrompt } from "@/agent/prompt-builder"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message, locale = "zh", provider, model, history } = body as {
    message: string
    locale?: "zh" | "en"
    provider?: string
    model?: string
    history?: { role: "user" | "assistant"; content: string }[]
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

        const systemPrompt = await buildSystemPrompt("generation", message)

        const result = await runAgent({
          systemPrompt,
          userMessage: message,
          history,
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
