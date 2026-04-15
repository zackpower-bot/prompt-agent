"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Sidebar, TopBar } from "./app-nav"
import { cn } from "@/lib/utils"
import { Toaster } from "sonner"

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname.endsWith("/login")

  // Desktop sidebar: collapsed vs expanded (persisted in localStorage)
  const [desktopCollapsed, setDesktopCollapsed] = useState(false)

  // Mobile sheet: open vs closed
  const [mobileOpen, setMobileOpen] = useState(false)

  // Track screen size
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)")
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Load desktop collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed")
    if (saved === "true") setDesktopCollapsed(true)
  }, [])

  const toggleDesktop = useCallback(() => {
    setDesktopCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev))
      return !prev
    })
  }, [])

  // Close mobile sheet on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  if (isLogin) return <>{children}</>

  return (
    <div className="flex h-screen overflow-hidden">
      {isMobile && (
        <>
          {mobileOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/40 transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div
            className={cn(
              "fixed left-0 top-0 z-50 h-full w-64 bg-background shadow-lg transition-transform duration-200",
              mobileOpen ? "translate-x-0" : "-translate-x-full"
            )}
          >
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </>
      )}

      {!isMobile && (
        <aside
          className={cn(
            "hidden h-screen shrink-0 bg-background md:block",
            desktopCollapsed ? "w-14" : "w-60"
          )}
        >
          <Sidebar collapsed={desktopCollapsed} onToggle={toggleDesktop} />
        </aside>
      )}

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <TopBar onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <Toaster position="top-center" richColors />
    </div>
  )
}


