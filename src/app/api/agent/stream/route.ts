import { NextRequest } from "next/server"
import { runAgent } from "@/agent/core"
import type { AgentTrajectoryStep } from "@/agent/core"
import { getGenerationTools } from "@/agent/tools"
import { buildSystemPrompt } from "@/agent/prompt-builder"
import type { ProviderName } from "@/lib/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { message, locale = "zh", provider, model, history, preferredChain } = body as {
    message: string
    locale?: "zh" | "en"
    provider?: string
    model?: string
    history?: { role: "user" | "assistant"; content: string }[]
    preferredChain?: Array<{ provider: string; model?: string }>
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
          tools: getGenerationTools(),
          locale,
          provider: provider as any,
          model,
          preferredChain: preferredChain as Array<{ provider: ProviderName; model?: string }> | undefined,
          onStep: (step: AgentTrajectoryStep) => {
            send("step", step)
          },
          onToken: (token: string) => {
            send("token", { token })
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
