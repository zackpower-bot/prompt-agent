"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Bot, Library, Sparkles, Wrench, Blocks, BarChart3, LogOut, PanelLeftClose, PanelLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { logoutAction } from "@/app/actions/auth.actions"

const navItems = [
  { href: "/", label: "生成", icon: Sparkles },
  { href: "/prompts", label: "提示词库", icon: Library },
  { href: "/modules", label: "模块", icon: Blocks },
  { href: "/cleanup", label: "清洗", icon: Wrench },
  { href: "/stats", label: "统计", icon: BarChart3 },
]

interface AppNavProps {
  collapsed: boolean
  onToggle: () => void
}

export function AppNav({ collapsed, onToggle }: AppNavProps) {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(zh|en)/, "") || "/"

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-50 flex h-screen flex-col border-r bg-background transition-all duration-200",
        collapsed ? "w-14" : "w-52"
      )}
    >
      {/* Logo + collapse */}
      <div className="flex h-14 items-center justify-between border-b px-3">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border-2 border-foreground bg-agent">
              <Bot className="h-3.5 w-3.5 text-agent-foreground" />
            </div>
            <span className="font-semibold tracking-tight text-sm">Prompt Agent</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            <div className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-foreground bg-agent">
              <Bot className="h-3.5 w-3.5 text-agent-foreground" />
            </div>
          </Link>
        )}
        {!collapsed && (
          <button
            onClick={onToggle}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 p-2">
        {collapsed && (
          <button
            onClick={onToggle}
            className="mb-2 flex w-full items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}
        {navItems.map((item) => {
          const isActive = item.href === "/" ? path === "/" : path.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-foreground text-background font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: theme + logout */}
      <div className="border-t p-2 space-y-1">
        <div className={cn("flex items-center", collapsed ? "justify-center" : "px-1")}>
          <ThemeToggle />
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed && "justify-center px-0"
            )}
            title={collapsed ? "退出" : undefined}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>退出</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
