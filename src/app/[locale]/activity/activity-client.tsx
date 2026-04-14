"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { useTranslations, useFormatter } from "next-intl"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { ActionLogRow } from "@/lib/action-log"
import { fetchActivityLogs, reverseActionById } from "@/app/actions/activity.actions"

interface ActivityClientProps {
  initialActions: ActionLogRow[]
}

type TranslateFn = ReturnType<typeof useTranslations>

export function ActivityClient({ initialActions }: ActivityClientProps) {
  const t = useTranslations("activity")
  const formatter = useFormatter()
  const [actions, setActions] = useState(initialActions)
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, startTransition] = useTransition()

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await fetchActivityLogs({ limit: 50 })
      if (result.success) {
        setActions(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
    })
  }, [])

  useEffect(() => {
    function handleFocus() {
      refresh()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [refresh])

  const handleUndo = useCallback(
    async (logId: string) => {
      setUndoingId(logId)
      setError(null)
      try {
        const result = await reverseActionById(logId)
        if (!result.success) {
          setError(result.error ?? t("undoFailed"))
        }
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setUndoingId(null)
        refresh()
      }
    },
    [refresh, t]
  )

  const content = useMemo(() => {
    if (actions.length === 0) {
      return (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <h2 className="text-xl">活动会在这里慢慢出现</h2>
          <p className="mx-auto mt-3 max-w-[38rem] text-sm leading-7 text-muted-foreground">{t("empty")}</p>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {actions.map((action) => {
          const createdAt = new Date(action.createdAt)
          const reversibleUntil = action.reversibleUntil ? new Date(action.reversibleUntil) : null
          const isUndoable = !action.reversedAt && reversibleUntil && reversibleUntil.getTime() > Date.now()
          const targetTitle = getTargetTitle(action)
          const description = getActionDescription(action, t, targetTitle)
          return (
            <Card key={action.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{getActorLabel(action.actor, t)}</Badge>
                    <span className="text-sm font-medium">{description}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatter.relativeTime(createdAt)}</span>
                </div>
                {targetTitle && (
                  <p className="text-xs text-muted-foreground">
                    ID: <span className="font-mono text-[11px]">{action.targetId}</span>
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  {action.reversedAt ? (
                    <Badge variant="secondary">
                      {t("statusReversed", { actor: getReversalActorLabel(action.reversedBy, t) })}
                    </Badge>
                  ) : isUndoable ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleUndo(action.id)}
                        disabled={undoingId === action.id}
                      >
                        {undoingId === action.id ? t("undoing") : t("undo")}
                      </Button>
                      {reversibleUntil && (
                        <span className="text-xs text-muted-foreground">
                          {t("reversibleUntil", { time: formatter.dateTime(reversibleUntil) })}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {reversibleUntil ? t("statusExpired") : t("statusNotReversible")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }, [actions, formatter, handleUndo, t, undoingId])

  return (
    <div className="h-full overflow-y-auto px-4 py-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? t("refreshing") : t("refresh")}
          </Button>
        </div>
        {content}
      </div>
    </div>
  )
}

function getTargetTitle(action: ActionLogRow): string {
  const before = action.before as { title?: string; name?: string } | undefined
  const after = action.after as { title?: string; name?: string } | undefined
  return before?.title ?? before?.name ?? after?.title ?? after?.name ?? action.targetId
}

function getActionDescription(action: ActionLogRow, t: TranslateFn, title: string): string {
  if (action.action === "soft_delete") {
    if (action.targetType === "prompt") {
      return t("softDeletePrompt", { title })
    }
    if (action.targetType === "module") {
      return t("softDeleteModule", { title })
    }
  }
  return `${action.action} ${action.targetType}`
}

function getActorLabel(actor: ActionLogRow["actor"], t: TranslateFn) {
  if (actor === "agent") return t("actorAgent")
  return t("actorUser")
}

function getReversalActorLabel(
  actor: ActionLogRow["reversedBy"],
  t: TranslateFn
) {
  if (actor === "system") return t("actorSystem")
  if (actor === "user") return t("actorUser")
  return t("actorSystem")
}
