"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Square } from "lucide-react"
import type { AgentStatus } from "@/hooks/use-agent-stream"

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
    <div className="flex items-end gap-2">
      <Textarea
        value={value}
        onChange={(e) => updateValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? "Agent 正在工作..." : "描述你想要的提示词..."}
        disabled={isRunning}
        className="min-h-[80px] resize-none"
        rows={3}
        data-testid="agent-input-textarea"
      />
      {isRunning ? (
        <Button variant="destructive" size="icon" onClick={onStop} className="h-10 w-10 shrink-0">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" onClick={handleSubmit} disabled={!value.trim()} className="h-10 w-10 shrink-0">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}