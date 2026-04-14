"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Send, Square } from "lucide-react"
import type { AgentStatus } from "@/hooks/use-agent-stream"
import { cn } from "@/lib/utils"

interface AgentInputProps {
  status: AgentStatus
  onSubmit: (message: string) => void
  onStop: () => void
  initialValue?: string
  onChange?: (value: string) => void
}

export function AgentInput({ status, onSubmit, onStop, initialValue, onChange }: AgentInputProps) {
  const [internalValue, setInternalValue] = useState(initialValue ?? "")
  const isControlled = typeof onChange === "function"
  const value = isControlled ? initialValue ?? "" : internalValue
  const isRunning = status === "running"

  useEffect(() => {
    if (!isControlled && initialValue !== undefined) {
      setInternalValue(initialValue)
    }
  }, [initialValue, isControlled])

  const updateValue = useCallback((next: string) => {
    if (!isControlled) {
      setInternalValue(next)
    }
    onChange?.(next)
  }, [isControlled, onChange])

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || isRunning) return
    onSubmit(trimmed)
    if (isControlled) {
      onChange?.("")
    } else {
      setInternalValue("")
    }
  }, [value, isRunning, onSubmit, isControlled, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSubmit()
      }
    },
    [handleSubmit]
  )

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col rounded-2xl border border-input/80 bg-card shadow-xs transition-all",
        "hover:border-input focus-within:border-ring/60 focus-within:ring-2 focus-within:ring-ring/20 focus-within:shadow-sm",
        isRunning && "opacity-95"
      )}
    >
      <textarea
        value={value}
        onChange={(e) => updateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? "Agent 正在工作..." : "描述你想要的提示词..."}
        disabled={isRunning}
        rows={3}
        data-testid="agent-input-textarea"
        className="w-full resize-none border-0 bg-transparent px-5 pt-4 pb-14 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60"
      />
      <div className="absolute bottom-2.5 right-2.5 flex items-center gap-2">
        {isRunning ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-9 w-9 rounded-lg shadow-xs"
            aria-label="停止"
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="h-9 w-9 rounded-lg shadow-xs"
            aria-label="发送"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-2.5 left-5 select-none text-[11px] text-muted-foreground/70">
        Enter 发送 · Shift+Enter 换行
      </div>
    </div>
  )
}
