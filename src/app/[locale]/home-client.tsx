"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { EmptyState } from "@/components/home/empty-state"
import { AgentInput } from "@/components/agent/agent-input"
import { ResultCanvas } from "@/components/agent/result-canvas"
import { ResultActions } from "@/components/agent/result-actions"
import {
  ResultDetailsDrawer,
  type ResultQualitySignal,
  type SimilarPrompt,
} from "@/components/agent/result-details-drawer"
import { Button } from "@/components/ui/button"
import { useAgentStream, type AgentStatus, type ConversationTurn } from "@/hooks/use-agent-stream"
import { useModelChain } from "@/hooks/use-model-chain"

interface HomeClientProps {
  recentTasksSlot: ReactNode
}

export default function HomeClient({ recentTasksSlot }: HomeClientProps) {
  const { status, steps, result, error, streamingText, turns, run, stop, reset } = useAgentStream()
  const { chain } = useModelChain()
  const [inputValue, setInputValue] = useState("")
  const [currentTask, setCurrentTask] = useState("")
  const [qualitySignal, setQualitySignal] = useState<ResultQualitySignal | null>(null)
  const [similarPrompts, setSimilarPrompts] = useState<SimilarPrompt[]>([])
  const [detailsOpen, setDetailsOpen] = useState(false)

  const hasTurns = turns.length > 0
  const workspaceActive = hasTurns || status === "running" || status === "error"
  const latestTurn = hasTurns ? turns[turns.length - 1] : null
  const activeTurn: ConversationTurn | null =
    status === "running"
      ? { userMessage: currentTask || latestTurn?.userMessage || "", steps, result, error }
      : latestTurn

  const displayTask = activeTurn?.userMessage || currentTask
  const streamingActive = status === "running" && !activeTurn?.result
  const canOpenDetails = Boolean(
    (activeTurn?.steps?.length ?? 0) > 0 || activeTurn?.result || qualitySignal || similarPrompts.length
  )

  useEffect(() => {
    if (status === "running") {
      setQualitySignal(null)
      setSimilarPrompts([])
    }
  }, [status])

  useEffect(() => {
    if (!canOpenDetails && detailsOpen) {
      setDetailsOpen(false)
    }
  }, [canOpenDetails, detailsOpen])

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => {
      document.querySelector<HTMLTextAreaElement>("[data-testid=\"agent-input-textarea\"]")?.focus()
    })
  }, [])

  const handleSubmit = useCallback(
    (message: string) => {
      const trimmed = message.trim()
      if (!trimmed) return
      setCurrentTask(trimmed)
      setInputValue("")
      run(trimmed, { preferredChain: chain })
    },
    [chain, run]
  )

  const handleTemplateSelect = useCallback(
    (prompt: string) => {
      setInputValue(prompt)
      focusInput()
    },
    [focusInput]
  )

  const handleReset = useCallback(() => {
    reset()
    setInputValue("")
    setCurrentTask("")
    setQualitySignal(null)
    setSimilarPrompts([])
    setDetailsOpen(false)
    focusInput()
  }, [focusInput, reset])

  const runningStep = steps.length > 0 ? steps[steps.length - 1] : null

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="home-workspace">
      {workspaceActive ? (
        <>
          <TaskBanner task={displayTask} status={status} onReset={handleReset} />
          <section className="min-h-0 flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[680px] flex-col gap-4 px-5 py-5">
              {status === "running" && (
                <RunningTicker stepIndex={Math.max(steps.length, 1)} tool={runningStep?.tool ?? null} />
              )}
              <ResultCanvas
                result={activeTurn?.result ?? null}
                streamingText={streamingActive ? streamingText : ""}
                isStreaming={streamingActive}
                duplicates={similarPrompts}
                onShowDuplicates={() => setDetailsOpen(true)}
              />
              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm leading-6 text-destructive">
                  {error}
                </div>
              )}
              {activeTurn && (
                <ResultActions
                  result={activeTurn.result}
                  steps={activeTurn.steps}
                  userMessage={activeTurn.userMessage}
                  outputText={activeTurn.result?.text ?? streamingText}
                  onQualityResult={setQualitySignal}
                  onSimilarPrompts={setSimilarPrompts}
                />
              )}
              {canOpenDetails && (
                <Button variant="secondary" className="self-start" onClick={() => setDetailsOpen(true)}>
                  查看执行详情
                </Button>
              )}
            </div>
          </section>
          <ComposerBar
            status={status}
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}
            onStop={stop}
            onReset={handleReset}
            showResetButton
          />
        </>
      ) : (
        <>
          <section className="min-h-0 flex-1 overflow-y-auto">
            <EmptyState onTemplateSelect={handleTemplateSelect} recentTasksSlot={recentTasksSlot} />
          </section>
          <ComposerBar status={status} value={inputValue} onChange={setInputValue} onSubmit={handleSubmit} onStop={stop} />
        </>
      )}

      <ResultDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        steps={activeTurn?.steps ?? []}
        result={activeTurn?.result ?? null}
        qualitySignal={qualitySignal}
        similarPrompts={similarPrompts}
      />
    </div>
  )
}

function TaskBanner({ task, status, onReset }: { task: string; status: AgentStatus; onReset: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[680px] items-start justify-between gap-3 px-5 py-3">
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Active task</p>
          <p className="font-serif text-[15px] leading-6 text-foreground line-clamp-2">{task || "等待新的任务描述"}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={status} />
          <Button variant="ghost" size="sm" onClick={onReset}>
            新任务
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: AgentStatus }) {
  const meta: Record<AgentStatus, { label: string; className: string }> = {
    idle: { label: "待命", className: "border-border bg-background text-muted-foreground" },
    running: { label: "运行中", className: "border-agent/30 bg-agent/10 text-agent" },
    complete: { label: "已完成", className: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700" },
    error: { label: "异常", className: "border-destructive/20 bg-destructive/10 text-destructive" },
  }
  const data = meta[status]
  return <span className={`rounded-full border px-3 py-1 text-xs font-medium ${data.className}`}>{data.label}</span>
}

function RunningTicker({ stepIndex, tool }: { stepIndex: number; tool: string | null }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background px-4 py-2 text-xs font-medium text-foreground shadow-xs">
      <span className="flex items-center gap-2 text-sm text-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-agent" />
        思考中... 第 {stepIndex} 步
      </span>
      <span className="text-xs text-muted-foreground">当前工具：{tool ?? "模型推理"}</span>
    </div>
  )
}

function ComposerBar({
  status,
  value,
  onChange,
  onSubmit,
  onStop,
  onReset,
  showResetButton,
}: {
  status: AgentStatus
  value: string
  onChange: (value: string) => void
  onSubmit: (message: string) => void
  onStop: () => void
  onReset?: () => void
  showResetButton?: boolean
}) {
  return (
    <div className="sticky bottom-0 z-20 bg-background/85 px-4 py-3 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-[680px] px-2 sm:px-0">
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <AgentInput status={status} onSubmit={onSubmit} onStop={onStop} initialValue={value} onChange={onChange} />
          </div>
          {showResetButton && onReset && (
            <Button variant="outline" size="sm" onClick={onReset} className="shrink-0">
              重置
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
          Enter 发送 · Shift+Enter 换行
        </p>
      </div>
    </div>
  )
}
