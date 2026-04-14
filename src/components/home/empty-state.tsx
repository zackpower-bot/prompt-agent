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
    <section className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-8">
        <header className="space-y-3 text-center md:text-left">
          <p className="mono-label text-xs uppercase tracking-[0.35em] text-muted-foreground">Prompt Agent</p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">Prompt Agent</h1>
          <p className="text-base leading-7 text-muted-foreground">生成、管理、复用你的提示词资产</p>
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
