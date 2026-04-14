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
    <article className="space-y-4">
      <div className="mb-4 space-y-1">
        <h2 className="text-xl">快速入口</h2>
        <p className="text-sm text-muted-foreground">直达高频功能页，随时复用沉淀的资产。</p>
      </div>
      <ul className="space-y-2">
        {QUICK_LINKS.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="group flex items-start justify-between rounded-lg border border-border/50 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div>
                <h3 className="font-serif text-base">{link.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{link.description}</p>
              </div>
              <ArrowUpRight className="mt-1 h-4 w-4 text-muted-foreground transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="rounded-2xl border border-dashed border-agent/40 bg-agent/5 px-4 py-4 text-sm leading-6 text-muted-foreground">
        运行完一个任务后，这里会展示结果画布、保存入口与执行轨迹，帮助你真正沉淀提示词资产。
      </div>
    </article>
  )
}
