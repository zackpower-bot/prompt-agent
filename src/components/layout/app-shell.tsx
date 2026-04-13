"use client"

import { usePathname } from "next/navigation"
import { AppNav } from "./app-nav"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname.endsWith("/login")

  if (isLogin) return <>{children}</>

  return (
    <div className="min-h-screen">
      <AppNav />
      {children}
    </div>
  )
}
