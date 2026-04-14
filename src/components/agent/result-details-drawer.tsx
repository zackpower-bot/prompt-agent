"use client"

import { X } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrajectoryView } from "@/components/agent/trajectory-view"
import type { AgentResult, TrajectoryStep } from "@/hooks/use-agent-stream"

export interface SimilarPrompt {
  id: string
  title: string
  similarity: number
}

export interface ResultQualitySignal {
  score: number
  passed: boolean
  warning: string | null
  suggestions: string[]
}

interface ResultDetailsDrawerProps {
  open: boolean
  onClose: () => void
  steps: TrajectoryStep[]
  result: AgentResult | null
  qualitySignal: ResultQualitySignal | null
  similarPrompts: SimilarPrompt[]
}

export function ResultDetailsDrawer({
  open,
  onClose,
  steps,
  result,
  qualitySignal,
  similarPrompts,
}: ResultDetailsDrawerProps) {
  if (!open) return null

  const qualityScore =
    qualitySignal && qualitySignal.score >= 0 ? `${Math.round(qualitySignal.score * 100)}%` : "待检测"

  return (
    <>
      <button
        type="button"
        aria-label="关闭执行详情"
        className="fixed inset-0 top-12 z-40 bg-black/35"
        onClick={onClose}
      />
      <aside className="fixed inset-y-12 right-0 z-50 w-full max-w-md border-l border-border bg-background shadow-2xl">
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-foreground">执行详情</p>
              <p className="mt-1 text-xs text-muted-foreground">查看模型元数据、质量评估、相似提示词与执行轨迹。</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} aria-label="关闭执行详情">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto px-5 py-5 text-sm leading-6">
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">结果元数据</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <MetaItem label="Provider/Model" value={result ? `${result.provider} / ${result.model}` : "-"} />
                <MetaItem label="输入 Tokens" value={result ? String(result.usage.inputTokens) : "-"} />
                <MetaItem label="输出 Tokens" value={result ? String(result.usage.outputTokens) : "-"} />
                <MetaItem label="执行步数" value={String(steps.length || result?.trajectoryCount || 0)} />
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">质量检查</h3>
                {qualitySignal && (
                  <Badge variant={qualitySignal.passed ? "secondary" : "destructive"}>{qualityScore}</Badge>
                )}
              </div>
              <div className="mt-3 rounded-2xl border border-border/60 bg-background px-4 py-4">
                {qualitySignal ? (
                  <>
                    <p className="text-sm text-foreground">
                      {qualitySignal.warning ?? "已通过质量检查。"}
                    </p>
                    {qualitySignal.suggestions.length > 0 && (
                      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {qualitySignal.suggestions.map((suggestion) => (
                          <li key={suggestion}>· {suggestion}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">保存后会自动触发质量检查与提示。</p>
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">相似提示词</h3>
                {similarPrompts.length > 0 && <Badge variant="outline">{similarPrompts.length}</Badge>}
              </div>
              {similarPrompts.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {similarPrompts.map((prompt) => (
                    <Link
                      key={prompt.id}
                      href={`/prompts/${prompt.id}`}
                      className="block rounded-2xl border border-border/60 bg-background px-4 py-4 transition hover:border-agent/60"
                    >
                      <p className="font-medium text-foreground">{prompt.title}</p>
                      <p className="text-xs text-muted-foreground">相似度 {Math.round(prompt.similarity * 100)}%</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">暂无相似提示词命中。</p>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">执行轨迹</h3>
                <Badge variant="secondary">{steps.length} 步</Badge>
              </div>
              <div className="mt-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
                {steps.length > 0 ? (
                  <TrajectoryView steps={steps} className="h-[320px]" />
                ) : (
                  <p className="text-sm text-muted-foreground">暂无可展示的运行轨迹。</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  )
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 font-mono text-sm text-foreground">{value}</p>
    </div>
  )
}
