"use client"

import { useAgentStream } from "@/hooks/use-agent-stream"
import { AgentInput } from "@/components/agent/agent-input"
import { TrajectoryView } from "@/components/agent/trajectory-view"
import { ResultView } from "@/components/agent/result-view"
import { Sparkles, RotateCcw, ChevronDown, Loader2 } from "lucide-react"
import { useState, useCallback, useRef, useEffect } from "react"

export default function Home() {
  const { status, steps, result, error, streamingText, turns, run, stop, reset } = useAgentStream()
  const [lastMessage, setLastMessage] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  const handleSubmit = useCallback((msg: string) => {
    setLastMessage(msg)
    run(msg)
  }, [run])

  const hasConversation = turns.length > 0 || steps.length > 0

  // Auto-scroll to bottom on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [turns.length, steps.length, streamingText, result])

  return (
    <div className="flex h-screen flex-col">
      {/* Scrollable conversation area */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6">
          {/* Empty state */}
          {!hasConversation && (
            <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
              <Sparkles className="mb-3 h-8 w-8 text-agent" />
              <h2 className="text-lg font-semibold">Prompt Agent</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                描述你的想法，Agent 自动生成、分类、标签提示词
              </p>
            </div>
          )}

          {/* Conversation turns */}
          <div className="space-y-6">
            {turns.map((turn, i) => (
              <div key={i} className="space-y-3">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-foreground px-4 py-2.5 text-sm text-background">
                    {turn.userMessage}
                  </div>
                </div>

                {/* Agent response */}
                <div className="space-y-2">
                  {/* Thinking process — collapsed like Claude */}
                  {turn.steps.length > 0 && (
                    <details className="group">
                      <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                        <Sparkles className="h-3 w-3" />
                        <span>思考了 {turn.steps.length} 步</span>
                        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-2 rounded-lg border bg-muted/30">
                        <TrajectoryView steps={turn.steps} className="max-h-[300px]" />
                      </div>
                    </details>
                  )}

                  {/* Result */}
                  {turn.result && (
                    <ResultView result={turn.result} steps={turn.steps} userMessage={turn.userMessage} />
                  )}

                  {turn.error && (
                    <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                      {turn.error}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Current turn (live) */}
            {status === "running" && (
              <div className="space-y-3">
                {/* User message */}
                {lastMessage && (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-foreground px-4 py-2.5 text-sm text-background">
                      {lastMessage}
                    </div>
                  </div>
                )}

                {/* Agent thinking indicator — compact, shows latest step only */}
                <div className="space-y-2">
                  <details open className="group">
                    <summary className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent transition-colors">
                      <Loader2 className="h-3 w-3 animate-spin text-agent" />
                      <span className="text-agent">
                        {steps.length > 0
                          ? `思考中... 第 ${steps.length} 步`
                          : "思考中..."}
                      </span>
                      <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-2 rounded-lg border bg-muted/30">
                      <TrajectoryView steps={steps} className="max-h-[200px]" />
                    </div>
                  </details>

                  {/* Streaming text — the main output, shown directly like ChatGPT */}
                  {streamingText && (
                    <div className="rounded-lg border bg-card px-4 py-3">
                      <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-sm">
                        {streamingText}
                      </div>
                      <span className="mt-1 inline-block h-4 w-0.5 animate-pulse bg-agent" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <div ref={bottomRef} className="h-4" />
        </div>
      </div>

      {/* Fixed input area at bottom */}
      <div className="border-t bg-background px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-end gap-2">
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
        <p className="mt-1 text-center mono-label text-muted-foreground">
          {hasConversation ? "继续对话以迭代优化 · 点击 ↻ 开始新对话" : "Enter 发送 · Shift+Enter 换行"}
        </p>
      </div>
    </div>
  )
}
