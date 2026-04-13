"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Bot, Library, Sparkles, Wrench, Blocks, BarChart3, LogOut, PanelLeftClose, PanelLeft, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"
import { SidebarPrompts } from "./sidebar-prompts"
import { logoutAction } from "@/app/actions/auth.actions"

const navItems = [
  { href: "/", label: "生成", icon: Sparkles },
  { href: "/prompts", label: "提示词库", icon: Library },
  { href: "/modules", label: "模块", icon: Blocks },
  { href: "/cleanup", label: "清洗", icon: Wrench },
  { href: "/stats", label: "统计", icon: BarChart3 },
]

// Top bar high-frequency shortcuts (desktop only)
const topNavShortcuts = [
  { href: "/", label: "生成", icon: Sparkles },
  { href: "/prompts", label: "提示词库", icon: Library },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  onNavigate?: () => void // for mobile: close after click
}

export function Sidebar({ collapsed, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname()
  const path = pathname.replace(/^\/(zh|en)/, "") || "/"

  return (
    <div className="flex h-full flex-col">
      {/* Collapse toggle (desktop only) */}
      <div className="hidden md:flex h-12 items-center justify-end px-3 border-b">
        <button
          onClick={onToggle}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? path === "/" : path.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                collapsed && "justify-center px-2",
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

      {/* Favorites & Recent (expanded only) */}
      {!collapsed && (
        <div className="border-t py-2">
          <SidebarPrompts onNavigate={onNavigate} />
        </div>
      )}

      {/* Bottom: settings + theme + logout */}
      <div className="border-t p-2 space-y-1">
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "设置" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>设置</span>}
        </Link>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "px-1")}>
          <ThemeToggle />
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
              collapsed && "justify-center px-2"
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
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center px-4">
        {/* Menu button (mobile) / Logo */}
        <button
          onClick={onMenuClick}
          className="mr-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors md:hidden"
        >
          <PanelLeft className="h-4 w-4" />
        </button>

        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-sm border-2 border-foreground bg-agent">
            <Bot className="h-3 w-3 text-agent-foreground" />
          </div>
          <span className="font-semibold tracking-tight text-sm">Prompt Agent</span>
        </Link>

        {/* Desktop shortcuts */}
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
                    ? "bg-foreground text-background font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
