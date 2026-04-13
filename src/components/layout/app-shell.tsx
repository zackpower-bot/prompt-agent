"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { AppNav } from "./app-nav"
import { cn } from "@/lib/utils"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname.endsWith("/login")
  const [collapsed, setCollapsed] = useState(false)

  if (isLogin) return <>{children}</>

  return (
    <div className="min-h-screen">
      <AppNav collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className={cn("transition-all duration-200", collapsed ? "ml-14" : "ml-52")}>
        {children}
      </main>
    </div>
  )
}
