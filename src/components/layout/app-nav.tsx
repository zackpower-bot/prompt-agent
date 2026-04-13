"use client"

import { usePathname } from "next/navigation"
import { Link } from "@/i18n/navigation"
import { Bot, Library, Sparkles, Wrench, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

const navItems = [
  { href: "/", label: "生成", icon: Sparkles },
  { href: "/prompts", label: "提示词库", icon: Library },
  { href: "/cleanup", label: "清洗", icon: Wrench },
]

export function AppNav() {
  const pathname = usePathname()
  // Strip locale prefix for matching
  const path = pathname.replace(/^\/(zh|en)/, "") || "/"

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="flex h-7 w-7 items-center justify-center rounded-sm border-2 border-foreground bg-agent">
            <Bot className="h-3.5 w-3.5 text-agent-foreground" />
          </div>
          <span className="font-semibold tracking-tight">Prompt Agent</span>
        </Link>

        {/* Nav items */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? path === "/" : path.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
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
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-3 w-3" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
