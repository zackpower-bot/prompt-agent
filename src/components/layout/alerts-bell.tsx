"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bell, BellRing, Check } from "lucide-react"
import { useTranslations, useFormatter } from "next-intl"

import { Button } from "@/components/ui/button"
import { parseJsonResponseOrThrow, readErrorResponse } from "@/lib/utils"

type AlertRecord = {
  id: string
  type: string
  severity: "info" | "warning" | "critical"
  message: string
  metadata: Record<string, unknown>
  acknowledged: boolean
  acknowledgedAt?: string | null
  createdAt: string
}

const severityColors: Record<AlertRecord["severity"], string> = {
  info: "bg-sky-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
}

type TranslateFn = ReturnType<typeof useTranslations>
type FormatterFn = ReturnType<typeof useFormatter>

export function AlertsBell() {
  const t = useTranslations("alerts")
  const formatter = useFormatter()
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [alerts, setAlerts] = useState<AlertRecord[]>([])
  const [unackCount, setUnackCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [ackLoading, setAckLoading] = useState<string | null>(null)

  const loadAlerts = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts", { cache: "no-store" })
      const data = await parseJsonResponseOrThrow<{ alerts?: AlertRecord[]; unackCount?: number }>(
        res,
        `Failed to load alerts: ${res.status}`,
      )
      const records = Array.isArray(data.alerts) ? data.alerts : []
      setAlerts(records)
      setUnackCount(
        typeof data.unackCount === "number" ? data.unackCount : records.filter((row) => !row.acknowledged).length,
      )
    } catch (error) {
      console.warn("[alerts-bell]", error)
    }
  }, [])

  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 30_000)
    return () => clearInterval(interval)
  }, [loadAlerts])

  useEffect(() => {
    if (!open) return
    function handlePointer(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", handlePointer)
    document.addEventListener("keydown", handleKey)
    return () => {
      document.removeEventListener("pointerdown", handlePointer)
      document.removeEventListener("keydown", handleKey)
    }
  }, [open])

  const acknowledge = useCallback(
    async (id: string) => {
      setAckLoading(id)
      setAlerts((prev) => prev.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert)))
      setUnackCount((count) => Math.max(0, count - 1))
      try {
        const res = await fetch(`/api/alerts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ acknowledged: true }),
        })
        if (!res.ok) throw new Error(await readErrorResponse(res, `Failed to acknowledge alert ${id}`))
        await loadAlerts()
      } catch (error) {
        console.warn("[alerts-bell]", error)
        await loadAlerts()
      } finally {
        setAckLoading(null)
      }
    },
    [loadAlerts],
  )

  const bellTitle = t("bellLabel")
  const Icon = unackCount > 0 ? BellRing : Bell

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative h-9 w-9 rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        aria-label={bellTitle}
        aria-expanded={open}
      >
        <span className="flex h-full w-full items-center justify-center">
          <Icon className="h-4 w-4" />
        </span>
        {unackCount > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" aria-hidden />}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-border/60 bg-card p-2 text-card-foreground shadow-md">
          {alerts.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <h3 className="font-serif text-base">暂无告警</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("empty")}</p>
            </div>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {alerts.map((alert) => {
                const typeLabel = getAlertTypeLabel(alert.type, t)
                const severityLabel = getSeverityLabel(alert.severity, t)
                const metadataLine = getAlertMetadataLine(alert, t, formatter)
                return (
                  <li key={alert.id} className="rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted/40">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 rounded-full ${severityColors[alert.severity]}`}
                        aria-hidden
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">{typeLabel}</p>
                            <p className="text-xs text-muted-foreground">{severityLabel}</p>
                          </div>
                          {!alert.acknowledged && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => acknowledge(alert.id)}
                              disabled={ackLoading === alert.id}
                              aria-label={t("acknowledge")}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-sm font-medium">{alert.message}</p>
                        {metadataLine}
                        <p className="text-xs text-muted-foreground">{formatRelativeTime(alert.createdAt, formatter)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function getAlertTypeLabel(type: string, t: TranslateFn) {
  if (type === "tavily_quota") return t("typeTavilyQuota")
  return type
}

function getSeverityLabel(severity: AlertRecord["severity"], t: TranslateFn) {
  if (severity === "critical") return t("severityCritical")
  if (severity === "warning") return t("severityWarning")
  return t("severityInfo")
}

function getAlertMetadataLine(alert: AlertRecord, t: TranslateFn, formatter: FormatterFn) {
  if (alert.type !== "tavily_quota") return null
  const metadata = (alert.metadata ?? {}) as { percentUsed?: number; resetAt?: string }
  const percent = typeof metadata.percentUsed === "number" ? Math.round(metadata.percentUsed * 100) : null
  const resetAt = typeof metadata.resetAt === "string" ? formatter.dateTime(new Date(metadata.resetAt)) : null
  if (percent === null && !resetAt) return null
  return (
    <p className="text-xs text-muted-foreground">
      {percent !== null ? `${t("typeTavilyQuota")} · ${percent}%` : null}
      {percent !== null && resetAt ? " · " : ""}
      {resetAt ? resetAt : null}
    </p>
  )
}

function formatRelativeTime(timestamp: string, formatter: FormatterFn) {
  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return ""
  return formatter.relativeTime(date)
}
