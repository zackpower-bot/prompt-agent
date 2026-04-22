"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Blocks,
  BookOpen,
  Bot,
  BrainCircuit,
  ChevronRight,
  History,
  Library,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react"

import { logoutAction } from "@/app/actions/auth.actions"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { ModelChainPicker } from "@/components/agent/model-chain-picker"
import { AlertsBell } from "./alerts-bell"
import { SidebarPrompts } from "./sidebar-prompts"
import { ThemeToggle } from "./theme-toggle"

const navGroups = [
  {
    label: "工作",
    items: [
      { href: "/compile", label: "编译", icon: BrainCircuit },
      { href: "/", label: "生成", icon: Sparkles },
      { href: "/prompts", label: "提示词库", icon: Library },
      { href: "/modules", label: "模块", icon: Blocks },
      { href: "/scenarios", label: "场景配方", icon: BookOpen },
      { href: "/recipes", label: "全部配方", icon: BookOpen },
      { href: "/cleanup", label: "清洗", icon: Wrench },
    ],
  },
  {
    label: "洞察",
    items: [
      { href: "/stats", label: "统计", icon: BarChart3 },
      { href: "/activity", label: "活动", icon: History },
    ],
  },
  {
    label: "系统",
    items: [{ href: "/settings", label: "设置", icon: Settings }],
  },
] as const

const routeLabels: Array<{ prefix: string; label: string }> = [
  { prefix: "/compile", label: "编译" },
  { prefix: "/prompts", label: "提示词库" },
  { prefix: "/modules", label: "模块" },
  { prefix: "/scenarios", label: "场景配方" },
  { prefix: "/recipes", label: "全部配方" },
  { prefix: "/cleanup", label: "清洗" },
  { prefix: "/stats", label: "统计" },
  { prefix: "/activity", label: "活动" },
  { prefix: "/settings", label: "设置" },
  { prefix: "/login", label: "登录" },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(zh|en)/, "") || "/"

  return (
    <div className="flex h-full flex-col border-r border-border/60 bg-sidebar px-1.5 py-2">
      <div className={cn("flex items-center gap-2 px-1.5 pb-3", collapsed && "justify-center")}>
        <Link
          href="/"
          onClick={onNavigate}
          className={cn(
            "flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-muted/50",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border/70 bg-agent/15">
            <Bot className="h-3.5 w-3.5 text-agent" />
          </div>
          {!collapsed && <span className="truncate font-serif text-sm text-foreground">Prompt Agent</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:inline-flex"
            aria-label="折叠侧栏"
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-1">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && "mt-4")}>
            {!collapsed && (
              <p className="px-2.5 pb-1 pt-2 text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = item.href === "/" ? path === "/" : path.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                      collapsed && "justify-center px-1.5",
                      isActive && "bg-muted/90 font-medium text-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-[13px] w-[13px] shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-border/60 px-1 pt-3">
          <SidebarPrompts onNavigate={onNavigate} />
        </div>
      )}

      {collapsed && (
        <div className="mt-auto px-1 pt-2">
          <button
            type="button"
            onClick={onToggle}
            className="hidden h-7 w-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:inline-flex"
            aria-label="展开侧栏"
          >
            <PanelLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(zh|en)/, "") || "/"

  const crumbs = useMemo(() => {
    const items = [{ href: "/", label: "Prompt Agent" }]
    if (path === "/") {
      items.push({ href: "/", label: "生成" })
      return items
    }

    const matched = routeLabels.find((item) => path === item.prefix || path.startsWith(`${item.prefix}/`))
    if (matched) {
      items.push({ href: matched.prefix, label: matched.label })
    }

    return items
  }, [path])

  return (
    <header className="sticky top-0 z-40 h-12 bg-background/80 backdrop-blur-sm">
      <div className="flex h-12 items-center gap-1 px-3.5">
        <div className="mr-auto flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground md:hidden"
            aria-label="打开导航"
          >
            <Menu className="h-3.5 w-3.5" />
          </button>
          <div className="hidden h-6 w-6 items-center justify-center rounded-md border border-border/70 bg-agent/15 md:flex">
            <Bot className="h-3.5 w-3.5 text-agent" />
          </div>
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            {crumbs.map((crumb, index) => (
              <div key={`${crumb.href}-${crumb.label}`} className="flex min-w-0 items-center gap-2">
                {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 opacity-50" />}
                <span className={cn("truncate", index === crumbs.length - 1 && "font-medium text-foreground")}>
                  {crumb.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <ModelChainPicker />
        <AlertsBell />
        <ThemeToggle />
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>
    </header>
  )
}
