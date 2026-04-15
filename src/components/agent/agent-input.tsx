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
        "group relative flex w-full items-end rounded-xl border border-input/80 bg-card shadow-xs transition-all",
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
        rows={1}
        data-testid="agent-input-textarea"
        className="block max-h-[200px] flex-1 resize-none border-0 bg-transparent pl-4 pr-2 py-3 text-[15px] leading-6 outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60 field-sizing-content"
      />
      <div className="flex items-center self-end pr-2 pb-2">
        {isRunning ? (
          <Button
            variant="destructive"
            size="icon"
            onClick={onStop}
            className="h-8 w-8 rounded-md shadow-xs"
            aria-label="停止"
          >
            <Square className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!value.trim()}
            className="h-8 w-8 rounded-md shadow-xs"
            aria-label="发送"
          >
            <Send className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}
