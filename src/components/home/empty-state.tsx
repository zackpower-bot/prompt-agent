"use client"

import type { ReactNode } from "react"
import { TemplateGrid } from "@/components/home/template-grid"
import { QuickLinks } from "@/components/home/quick-links"

interface EmptyStateProps {
  onTemplateSelect: (prompt: string) => void
  recentTasksSlot: ReactNode
}

export function EmptyState({ onTemplateSelect, recentTasksSlot }: EmptyStateProps) {
  return (
    <section className="flex-1 min-h-0 overflow-y-auto px-4 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-8">
        <header className="space-y-3 text-center md:text-left">
          <p className="text-sm font-medium text-muted-foreground">Prompt Agent 工作台</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Prompt Agent</h1>
          <p className="mx-auto max-w-[42rem] text-base leading-7 text-muted-foreground md:mx-0">
            在这里把零散想法整理成可复用的提示词资产，再慢慢沉淀成你的长期工作流。
            <br />
            从一个模板开始，或继续最近的任务，把今天的灵感写成以后还能反复调用的成果。
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          <TemplateGrid onSelect={onTemplateSelect} />
          {recentTasksSlot}
          <QuickLinks />
        </div>
      </div>
    </section>
  )
}
