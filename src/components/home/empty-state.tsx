"use client"

import type { ReactNode } from "react"
import { BarChart3, Blocks, Library } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { TemplateGrid } from "@/components/home/template-grid"
import { QuickLinks } from "@/components/home/quick-links"

interface EmptyStateProps {
  onTemplateSelect: (prompt: string) => void
  recentTasksSlot: ReactNode
}

export function EmptyState({ onTemplateSelect, recentTasksSlot }: EmptyStateProps) {
  return (
    <section className="mx-auto w-full max-w-[920px] px-6 py-10 md:px-10 md:py-16">
      <div className="space-y-10 pb-10">
        <header className="mx-auto max-w-[600px] space-y-3 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">生成 · generate</p>
          <h1 className="font-serif text-4xl font-normal tracking-[-0.02em] text-foreground md:text-5xl">
            今天想要什么提示词？
          </h1>
          <p className="text-sm leading-7 text-muted-foreground md:text-[15px]">
            把零散想法整理成可复用的提示词资产，
            <br className="hidden md:block" />
            再慢慢沉淀成你的长期工作流。
          </p>
        </header>

        <div className="grid gap-3 md:grid-cols-3">
          <QuickStatCard
            href="/prompts"
            icon={<Library className="h-3.5 w-3.5" />}
            title="提示词库"
            description="浏览并维护已保存的提示词资产，按收件箱与生产分层管理。"
          />
          <QuickStatCard
            href="/modules"
            icon={<Blocks className="h-3.5 w-3.5" />}
            title="模块"
            description="组合角色、约束与输出规范，把常用片段沉淀成可复用模块。"
          />
          <QuickStatCard
            href="/stats"
            icon={<BarChart3 className="h-3.5 w-3.5" />}
            title="统计"
            description="回看运行次数、质量信号与使用趋势，了解哪些资产值得长期维护。"
          />
        </div>

        <div className="space-y-8">
          <TemplateGrid onSelect={onTemplateSelect} />
          {recentTasksSlot}
          <QuickLinks />
        </div>
      </div>
    </section>
  )
}

function QuickStatCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card px-4 py-4 text-left transition-colors hover:border-primary/40"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-foreground">{icon}</div>
        <span className="text-sm font-medium text-foreground">{title}</span>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted-foreground">{description}</p>
    </Link>
  )
}
