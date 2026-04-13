"use client"

import { useState, useEffect, useCallback } from "react"
import { usePathname } from "next/navigation"
import { Sidebar, TopBar } from "./app-nav"
import { cn } from "@/lib/utils"

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
    <div className="min-h-screen">
      <TopBar onMenuClick={() => setMobileOpen(true)} />

      {/* Mobile: Sheet overlay sidebar */}
      {isMobile && (
        <>
          {/* Backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-50 bg-black/40 transition-opacity"
              onClick={() => setMobileOpen(false)}
            />
          )}
          {/* Sliding panel */}
          <div
            className={cn(
              "fixed left-0 top-0 z-50 h-full w-64 bg-background border-r shadow-lg transition-transform duration-200",
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

      {/* Desktop: persistent sidebar (no overlay) */}
      {!isMobile && (
        <aside
          className={cn(
            "fixed left-0 top-12 z-30 h-[calc(100vh-3rem)] border-r bg-background transition-all duration-200",
            desktopCollapsed ? "w-12" : "w-48"
          )}
        >
          <Sidebar collapsed={desktopCollapsed} onToggle={toggleDesktop} />
        </aside>
      )}

      {/* Main content */}
      <main
        className={cn(
          "transition-all duration-200",
          !isMobile && (desktopCollapsed ? "md:ml-12" : "md:ml-48")
        )}
      >
        {children}
      </main>
    </div>
  )
}
