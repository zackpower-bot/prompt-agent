"use client"

import { ArrowUpRight } from "lucide-react"
import { Link } from "@/i18n/navigation"

const QUICK_LINKS = [
  { href: "/prompts", label: "提示词库", description: "浏览并维护所有已保存的提示词资产" },
  { href: "/modules", label: "模块", description: "组合角色、约束与输出规范，搭建模块化资产" },
  { href: "/cleanup", label: "清洗", description: "批量清洗旧提示词，生成结构化优化建议" },
]

export function QuickLinks() {
  return (
    <article className="flex h-full flex-col rounded-3xl border border-border/60 bg-card/40 p-5 shadow-sm">
      <div className="mb-4 space-y-1">
        <h2 className="text-lg font-semibold">快速入口</h2>
        <p className="text-sm text-muted-foreground">直达高频功能页，随时复用沉淀的资产。</p>
      </div>
      <div className="space-y-3">
        {QUICK_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group flex items-start justify-between rounded-2xl border border-border/60 bg-background/80 px-4 py-3 transition hover:border-agent/60"
          >
            <div>
              <p className="text-sm font-medium text-foreground">{link.label}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{link.description}</p>
            </div>
            <ArrowUpRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </Link>
        ))}
      </div>
      <div className="mt-auto rounded-2xl border border-dashed border-agent/40 bg-agent/5 px-4 py-4 text-xs leading-5 text-muted-foreground">
        运行完一个任务后，这里会展示结果画布、保存入口与执行轨迹，帮助你真正沉淀提示词资产。
      </div>
    </article>
  )
}
