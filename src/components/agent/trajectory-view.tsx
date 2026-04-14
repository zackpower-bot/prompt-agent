"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { TrajectoryStep } from "@/hooks/use-agent-stream"
import { cn } from "@/lib/utils"

interface TrajectoryViewProps {
  steps: TrajectoryStep[]
  className?: string
}

export function TrajectoryView({ steps, className }: TrajectoryViewProps) {
  if (steps.length === 0) return null

  return (
    <ScrollArea className={cn("w-full", className)}>
      <div className="space-y-3 pr-3">
        {steps.map((step) => (
          <details key={`${step.step}-${step.timestamp}`} className="rounded-2xl border border-border/60 bg-background px-4 py-3">
            <summary className="cursor-pointer list-none text-sm font-medium text-foreground">
              <span className="font-mono text-xs text-muted-foreground">#{step.step} · {step.tool ?? "system"}</span>
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{step.content}</p>
          </details>
        ))}
      </div>
    </ScrollArea>
  )
}
