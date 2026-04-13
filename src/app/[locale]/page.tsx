"use client"

import { useAgentStream } from "@/hooks/use-agent-stream"
import { AgentInput } from "@/components/agent/agent-input"
import { TrajectoryView } from "@/components/agent/trajectory-view"
import { ResultView } from "@/components/agent/result-view"
import { Separator } from "@/components/ui/separator"
import { Bot, Sparkles, Library } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useState, useCallback } from "react"

export default function Home() {
  const { status, steps, result, error, run, stop } = useAgentStream()
  const [lastMessage, setLastMessage] = useState("")

  const handleSubmit = useCallback((msg: string) => {
    setLastMessage(msg)
    run(msg)
  }, [run])

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mb-3 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm border-2 border-foreground bg-agent">
            <Bot className="h-5 w-5 text-agent-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Agent</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          描述你的想法，Agent 自动生成、分类、标签提示词
        </p>
        <Link href="/prompts" className="btn-hard mt-4 inline-flex items-center gap-1.5 px-4 py-2">
          <Library className="h-3.5 w-3.5" />
          提示词库
        </Link>
      </div>

      {/* Agent Output Area */}
      <div className="flex-1 space-y-4">
        {/* Trajectory */}
        {steps.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center gap-2 border-b px-4 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-agent" />
              <span className="mono-label text-muted-foreground">Agent Trajectory</span>
              {status === "running" && (
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span className="agent-dot-pulse" />
                  <span className="mono-label text-agent">RUNNING</span>
                </span>
              )}
            </div>
            <TrajectoryView steps={steps} />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Result */}
        {result && <ResultView result={result} steps={steps} userMessage={lastMessage} />}
      </div>

      {/* Input Area */}
      <div className="mt-6">
        <Separator className="mb-4" />
        <AgentInput status={status} onSubmit={handleSubmit} onStop={stop} />
        <p className="mt-2 text-center mono-label text-muted-foreground">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </main>
  )
}
