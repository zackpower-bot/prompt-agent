"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Send, Square } from "lucide-react"
import type { AgentStatus } from "@/hooks/use-agent-stream"

interface AgentInputProps {
  status: AgentStatus
  onSubmit: (message: string) => void
  onStop: () => void
}

export function AgentInput({ status, onSubmit, onStop }: AgentInputProps) {
  const [input, setInput] = useState("")
  const isRunning = status === "running"

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim()
    if (!trimmed || isRunning) return
    onSubmit(trimmed)
    setInput("")
  }, [input, isRunning, onSubmit])

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
    <div className="flex gap-2 items-end">
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={isRunning ? "Agent 正在工作..." : "描述你想要的提示词..."}
        disabled={isRunning}
        className="min-h-[80px] resize-none"
        rows={3}
      />
      {isRunning ? (
        <Button variant="destructive" size="icon" onClick={onStop} className="shrink-0 h-10 w-10">
          <Square className="h-4 w-4" />
        </Button>
      ) : (
        <Button size="icon" onClick={handleSubmit} disabled={!input.trim()} className="shrink-0 h-10 w-10">
          <Send className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
