import { NextRequest } from "next/server"

import { runAgent } from "@/agent/core"
import { COMPILER_BASE_PROMPT } from "@/lib/compiler/base-prompt"
import type { ProviderName } from "@/lib/providers"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { goal, locale = "zh", provider, model, preferredChain } = body as {
    goal: string
    locale?: "zh" | "en"
    provider?: string
    model?: string
    preferredChain?: Array<{ provider: string; model?: string }>
  }

  if (!goal?.trim()) {
    return new Response(JSON.stringify({ error: "Goal is required" }), {
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
        send("status", { status: "compiling" })

        const result = await runAgent({
          systemPrompt: COMPILER_BASE_PROMPT,
          userMessage: goal,
          tools: [],
          locale,
          provider: provider as any,
          model,
          preferredChain: preferredChain as Array<{ provider: ProviderName; model?: string }> | undefined,
          maxIterations: 1,
          temperature: 0.3,
          onToken: (token: string) => send("token", { token }),
        })

        send("result", {
          text: result.text,
          provider: result.provider,
          model: result.model,
          usage: result.usage,
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
