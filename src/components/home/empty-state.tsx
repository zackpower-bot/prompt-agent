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
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <div className="space-y-10">
        <header className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Prompt Agent 工作台</p>
          <h1 className="text-3xl md:text-4xl">今天想要什么提示词？</h1>
          <p className="text-base leading-7 text-muted-foreground">
            在这里把零散想法整理成可复用的提示词资产，再慢慢沉淀成你的长期工作流。
            <br />
            从一个模板开始，或继续最近的任务，把今天的灵感写成以后还能反复调用的成果。
          </p>
        </header>

        <div className="space-y-8">
          <TemplateGrid onSelect={onTemplateSelect} />
          {recentTasksSlot}
          <QuickLinks />
        </div>
      </div>
    </section>
  )
}
