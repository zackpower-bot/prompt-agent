"use client"

import { usePathname } from "next/navigation"
import {
  BarChart3,
  Blocks,
  Bot,
  History,
  Layers,
  Library,
  LogOut,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sparkles,
  Wrench,
} from "lucide-react"

import { logoutAction } from "@/app/actions/auth.actions"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

import { AlertsBell } from "./alerts-bell"
import { SidebarPrompts } from "./sidebar-prompts"
import { ThemeToggle } from "./theme-toggle"

const navGroups = [
  {
    label: "工作",
    items: [
      { href: "/", label: "生成", icon: Sparkles },
      { href: "/prompts", label: "提示词库", icon: Library },
      { href: "/modules", label: "模块", icon: Blocks },
      { href: "/scenarios", label: "场景配方", icon: Layers },
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

const topNavShortcuts = [
  { href: "/", label: "生成", icon: Sparkles },
  { href: "/prompts", label: "提示词库", icon: Library },
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
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-4">
        {!collapsed ? (
          <Link href="/" onClick={onNavigate} className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-agent/15">
              <Bot className="h-4 w-4 text-agent" />
            </div>
            <span className="font-serif text-base text-foreground">Prompt Agent</span>
          </Link>
        ) : (
          <div className="mx-auto flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-agent/15">
            <Bot className="h-4 w-4 text-agent" />
          </div>
        )}
        <button
          onClick={onToggle}
          className="hidden rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground md:inline-flex"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {!collapsed && (
              <p className={cn("mb-1 px-3 text-[11px] uppercase tracking-wide text-muted-foreground/70", groupIndex === 0 ? "mt-2" : "mt-5")}>
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = item.href === "/" ? path === "/" : path.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
                      collapsed && "justify-center px-2.5",
                      isActive && "bg-muted/70 font-medium text-foreground"
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-border/60 py-3">
          <SidebarPrompts onNavigate={onNavigate} />
        </div>
      )}

      <div className="space-y-2 border-t border-border/60 px-3 py-4">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "px-1")}>
          <ThemeToggle />
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground",
              collapsed && "justify-center px-2.5"
            )}
            title={collapsed ? "退出" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>退出</span>}
          </button>
        </form>
      </div>
    </div>
  )
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(zh|en)/, "") || "/"

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border/60 bg-background/80 backdrop-blur-sm">
      <div className="flex h-14 items-center px-4">
        <button
          onClick={onMenuClick}
          className="mr-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground md:hidden"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-agent/15">
            <Bot className="h-4 w-4 text-agent" />
          </div>
          <span className="font-serif text-lg tracking-tight">Prompt Agent</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {topNavShortcuts.map((item) => {
            const isActive = item.href === "/" ? path === "/" : path.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-colors",
                  isActive
                    ? "bg-muted/70 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <AlertsBell />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
