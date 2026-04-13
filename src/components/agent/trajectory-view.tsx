"use client"

import { useEffect, useRef } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TrajectoryStep } from "@/hooks/use-agent-stream"
import { cn } from "@/lib/utils"

interface TrajectoryViewProps {
  steps: TrajectoryStep[]
  className?: string
}

const phaseConfig = {
  thought: { label: "THINK", dotClass: "bg-blue-500", badgeClass: "phase-thought" },
  action: { label: "ACT", dotClass: "bg-agent", badgeClass: "phase-action" },
  observation: { label: "OBS", dotClass: "bg-amber-500", badgeClass: "phase-observation" },
} as const

export function TrajectoryView({ steps, className }: TrajectoryViewProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [steps.length])

  if (steps.length === 0) return null

  return (
    <ScrollArea className={cn("max-h-[400px]", className)}>
      <div className="space-y-3 p-4">
        {steps.map((step) => {
          const config = phaseConfig[step.phase]
          return (
            <div key={step.step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={cn("h-2 w-2 rounded-full mt-2", config.dotClass)} />
                <div className="flex-1 w-px bg-border" />
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("mono-label inline-flex items-center rounded-sm border px-1.5 py-0.5", config.badgeClass)}>
                    {config.label}
                  </span>
                  {step.tool && (
                    <span className="tag-chip bg-secondary text-secondary-foreground">
                      {step.tool}
                    </span>
                  )}
                  <span className="mono-label text-muted-foreground">
                    #{step.step}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words leading-relaxed">
                  {step.content}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
