"use client"

import { useState, useCallback, useRef } from "react"

export interface TrajectoryStep {
  step: number
  phase: "thought" | "action" | "observation"
  content: string
  tool: string | null
  input: Record<string, unknown> | null
  data: Record<string, unknown> | null
  timestamp: string
}

export interface AgentResult {
  text: string
  provider: string
  model: string
  usage: { inputTokens: number; outputTokens: number }
  trajectoryCount: number
}

export type AgentStatus = "idle" | "running" | "complete" | "error"

export function useAgentStream() {
  const [status, setStatus] = useState<AgentStatus>("idle")
  const [steps, setSteps] = useState<TrajectoryStep[]>([])
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (message: string, options?: {
    locale?: "zh" | "en"
    provider?: string
    model?: string
  }) => {
    // Reset state
    setStatus("running")
    setSteps([])
    setResult(null)
    setError(null)

    // Abort previous request if any
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          locale: options?.locale ?? "zh",
          provider: options?.provider,
          model: options?.model,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        let eventType = ""
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith("data: ") && eventType) {
            const data = JSON.parse(line.slice(6))

            switch (eventType) {
              case "step":
                setSteps((prev) => [...prev, data as TrajectoryStep])
                break
              case "result":
                setResult(data as AgentResult)
                break
              case "error":
                setError(data.message)
                setStatus("error")
                break
              case "done":
                setStatus("complete")
                break
            }
            eventType = ""
          }
        }
      }

      // If we finished reading without explicit done/error
      setStatus((prev) => (prev === "running" ? "complete" : prev))
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message)
        setStatus("error")
      }
    }
  }, [])

  const stop = useCallback(() => {
    abortRef.current?.abort()
    setStatus((prev) => (prev === "running" ? "idle" : prev))
  }, [])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setStatus("idle")
    setSteps([])
    setResult(null)
    setError(null)
  }, [])

  return { status, steps, result, error, run, stop, reset }
}
