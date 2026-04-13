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

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface ConversationTurn {
  userMessage: string
  steps: TrajectoryStep[]
  result: AgentResult | null
  error: string | null
}

export type AgentStatus = "idle" | "running" | "complete" | "error"

export function useAgentStream() {
  const [status, setStatus] = useState<AgentStatus>("idle")
  const [steps, setSteps] = useState<TrajectoryStep[]>([])
  const [result, setResult] = useState<AgentResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [turns, setTurns] = useState<ConversationTurn[]>([])
  const abortRef = useRef<AbortController | null>(null)

  const run = useCallback(async (message: string, options?: {
    locale?: "zh" | "en"
    provider?: string
    model?: string
  }) => {
    setStatus("running")
    setSteps([])
    setResult(null)
    setError(null)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const currentSteps: TrajectoryStep[] = []
    let currentResult: AgentResult | null = null
    let currentError: string | null = null

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          locale: options?.locale ?? "zh",
          provider: options?.provider,
          model: options?.model,
          history,
        }),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

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
                currentSteps.push(data as TrajectoryStep)
                setSteps((prev) => [...prev, data as TrajectoryStep])
                break
              case "result":
                currentResult = data as AgentResult
                setResult(currentResult)
                break
              case "error":
                currentError = data.message
                setError(currentError)
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

      setStatus((prev) => (prev === "running" ? "complete" : prev))
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        currentError = (err as Error).message
        setError(currentError)
        setStatus("error")
      }
    }

    // Update conversation history
    if (currentResult) {
      setHistory((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: currentResult!.text },
      ])
    }

    // Record this turn
    setTurns((prev) => [
      ...prev,
      { userMessage: message, steps: currentSteps, result: currentResult, error: currentError },
    ])
  }, [history])

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
    setHistory([])
    setTurns([])
  }, [])

  return { status, steps, result, error, turns, run, stop, reset }
}
