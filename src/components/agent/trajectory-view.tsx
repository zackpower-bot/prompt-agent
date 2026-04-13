"use client"

import { useEffect, useRef } from "react"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { TrajectoryStep } from "@/hooks/use-agent-stream"
import { cn } from "@/lib/utils"

interface TrajectoryViewProps {
  steps: TrajectoryStep[]
  className?: string
}

const phaseConfig = {
  thought: { label: "思考", color: "bg-blue-500/10 text-blue-700 border-blue-200" },
  action: { label: "行动", color: "bg-green-500/10 text-green-700 border-green-200" },
  observation: { label: "观察", color: "bg-amber-500/10 text-amber-700 border-amber-200" },
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
                <div className={cn("h-2 w-2 rounded-full mt-2", {
                  "bg-blue-500": step.phase === "thought",
                  "bg-green-500": step.phase === "action",
                  "bg-amber-500": step.phase === "observation",
                })} />
                <div className="flex-1 w-px bg-border" />
              </div>
              <div className="flex-1 min-w-0 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={cn("text-[10px] font-mono", config.color)}>
                    {config.label}
                  </Badge>
                  {step.tool && (
                    <Badge variant="secondary" className="text-[10px] font-mono">
                      {step.tool}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    #{step.step}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
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
