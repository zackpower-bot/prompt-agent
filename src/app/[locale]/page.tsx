"use client"

import { useAgentStream } from "@/hooks/use-agent-stream"
import { AgentInput } from "@/components/agent/agent-input"
import { TrajectoryView } from "@/components/agent/trajectory-view"
import { ResultView } from "@/components/agent/result-view"
import { Separator } from "@/components/ui/separator"
import { Sparkles, RotateCcw, MessageSquare } from "lucide-react"
import { useState, useCallback } from "react"

export default function Home() {
  const { status, steps, result, error, turns, run, stop, reset } = useAgentStream()
  const [lastMessage, setLastMessage] = useState("")

  const handleSubmit = useCallback((msg: string) => {
    setLastMessage(msg)
    run(msg)
  }, [run])

  const hasConversation = turns.length > 0 || steps.length > 0

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-8">
      {/* Subtitle */}
      {!hasConversation && (
        <div className="mb-8 text-center">
          <p className="text-sm text-muted-foreground">
            描述你的想法，Agent 自动生成、分类、标签提示词
          </p>
        </div>
      )}

      {/* Conversation history */}
      <div className="flex-1 space-y-4">
        {/* Previous turns */}
        {turns.map((turn, i) => (
          <div key={i} className="space-y-3">
            {/* User message */}
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-lg bg-foreground px-4 py-2.5 text-sm text-background">
                {turn.userMessage}
              </div>
            </div>

            {/* Collapsed trajectory for past turns */}
            {turn.steps.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span className="mono-label">{turn.steps.length} STEPS</span>
                </summary>
                <div className="mt-2 rounded-lg border bg-card">
                  <TrajectoryView steps={turn.steps} />
                </div>
              </details>
            )}

            {/* Past result */}
            {turn.result && (
              <ResultView result={turn.result} steps={turn.steps} userMessage={turn.userMessage} />
            )}

            {turn.error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {turn.error}
              </div>
            )}
          </div>
        ))}

        {/* Current turn (live) */}
        {steps.length > 0 && status === "running" && (
          <div className="space-y-3">
            {lastMessage && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-lg bg-foreground px-4 py-2.5 text-sm text-background">
                  {lastMessage}
                </div>
              </div>
            )}
            <div className="overflow-hidden rounded-lg border bg-card">
              <div className="flex items-center gap-2 border-b px-4 py-2.5">
                <Sparkles className="h-3.5 w-3.5 text-agent" />
                <span className="mono-label text-muted-foreground">TRAJECTORY</span>
                <span className="ml-auto inline-flex items-center gap-1.5">
                  <span className="agent-dot-pulse" />
                  <span className="mono-label text-agent">RUNNING</span>
                </span>
              </div>
              <TrajectoryView steps={steps} />
            </div>
          </div>
        )}

        {/* Error (current) */}
        {error && status === "error" && turns.length === 0 && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="mt-6">
        <Separator className="mb-4" />
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <AgentInput status={status} onSubmit={handleSubmit} onStop={stop} />
          </div>
          {hasConversation && (
            <button
              onClick={reset}
              className="mb-[1px] flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              title="新对话"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-center mono-label text-muted-foreground">
          {hasConversation ? "继续对话以迭代优化 · 点击 ↻ 开始新对话" : "Enter 发送 · Shift+Enter 换行"}
        </p>
      </div>
    </main>
  )
}
