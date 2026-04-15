"use client"

import { useState, useTransition } from "react"
import { useTranslations } from "next-intl"
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Pencil, Play, Trash2, XCircle } from "lucide-react"

import {
  createTestCase,
  deleteTestCase,
  updateTestCase,
} from "@/app/actions/test-case.actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useModelChain } from "@/hooks/use-model-chain"
import type { Check, TestCaseDTO, TestCaseRunResult, VariablesMap } from "@/lib/test-case"

interface Props {
  promptId: string
  initialTestCases: TestCaseDTO[]
}

interface FormState {
  name: string
  userMessage: string
  variablesJson: string
  checksJson: string
}

function formatTime(value: string | null) {
  if (!value) return null
  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function describeCheck(check: Check) {
  if (check.label) return check.label
  switch (check.kind) {
    case "contains":
      return `contains "${check.value}"`
    case "not_contains":
      return `not contains "${check.value}"`
    case "equals":
      return `equals "${check.value}"`
    case "starts_with":
      return `starts with "${check.value}"`
    case "ends_with":
      return `ends with "${check.value}"`
    case "length":
      return `length ${check.min ?? 0}-${check.max ?? "max"}`
    case "regex":
      return `regex /${check.pattern}/${check.flags ?? ""}`
    case "json_path":
      return `json path ${check.path}`
    default:
      return "check"
  }
}

function createFormState(testCase?: TestCaseDTO): FormState {
  return {
    name: testCase?.name ?? "",
    userMessage: testCase?.userMessage ?? "",
    variablesJson: JSON.stringify(testCase?.variables ?? {}, null, 2),
    checksJson: JSON.stringify(testCase?.checks ?? [], null, 2),
  }
}

export function TestCaseSection({ promptId, initialTestCases }: Props) {
  const t = useTranslations("prompts.testCases")
  const { chain } = useModelChain()
  const [testCases, setTestCases] = useState(initialTestCases)
  const [editingId, setEditingId] = useState<string | "new" | null>(null)
  const [formState, setFormState] = useState<FormState>(createFormState())
  const [formError, setFormError] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})
  const [expandedOutputIds, setExpandedOutputIds] = useState<Record<string, boolean>>({})
  const [runResults, setRunResults] = useState<Record<string, TestCaseRunResult>>({})
  const [isPending, startTransition] = useTransition()

  const openCreate = () => {
    setEditingId("new")
    setFormState(createFormState())
    setFormError(null)
  }

  const openEdit = (testCase: TestCaseDTO) => {
    setEditingId(testCase.id)
    setFormState(createFormState(testCase))
    setFormError(null)
  }

  const closeSheet = (open: boolean) => {
    if (open) return
    setEditingId(null)
    setFormError(null)
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }))
  }

  const toggleOutputExpanded = (id: string) => {
    setExpandedOutputIds((current) => ({ ...current, [id]: !current[id] }))
  }

  const handleRun = async (id: string) => {
    setRunningId(id)
    try {
      const response = await fetch("/api/test-cases/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, preferredChain: chain }),
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.error ?? "Run failed")
      }

      setRunResults((current) => ({ ...current, [id]: payload as TestCaseRunResult }))
      setExpandedIds((current) => ({ ...current, [id]: true }))
      setTestCases((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                lastRunAt: (payload as TestCaseRunResult).finishedAt,
                lastResult: {
                  ranAt: (payload as TestCaseRunResult).finishedAt,
                  provider: (payload as TestCaseRunResult).provider,
                  model: (payload as TestCaseRunResult).model,
                  success: (payload as TestCaseRunResult).success,
                  output: (payload as TestCaseRunResult).output,
                  evaluations: (payload as TestCaseRunResult).evaluations,
                  error: (payload as TestCaseRunResult).error,
                },
              }
            : item
        )
      )
    } catch (error) {
      setFormError((error as Error).message)
    } finally {
      setRunningId(null)
    }
  }

  const handleDelete = (id: string) => {
    if (!window.confirm(t("deleteConfirm"))) return

    startTransition(async () => {
      const result = await deleteTestCase(id)
      if (!result.success) {
        setFormError(result.error)
        return
      }

      setTestCases((current) => current.filter((item) => item.id !== id))
      setRunResults((current) => {
        const next = { ...current }
        delete next[id]
        return next
      })
    })
  }

  const handleSubmit = () => {
    setFormError(null)

    let variables: VariablesMap
    let checks: Check[]

    try {
      const parsedVariables = JSON.parse(formState.variablesJson || "{}") as VariablesMap
      if (!parsedVariables || typeof parsedVariables !== "object" || Array.isArray(parsedVariables)) {
        throw new Error(t("validationJsonError", { error: "variables must be a JSON object" }))
      }
      variables = parsedVariables

      const parsedChecks = JSON.parse(formState.checksJson || "[]") as Check[]
      if (!Array.isArray(parsedChecks)) {
        throw new Error(t("validationJsonError", { error: "checks must be a JSON array" }))
      }
      checks = parsedChecks
    } catch (error) {
      setFormError((error as Error).message)
      return
    }

    startTransition(async () => {
      if (editingId === "new") {
        const result = await createTestCase({
          promptId,
          name: formState.name,
          userMessage: formState.userMessage,
          variables,
          checks,
        })
        if (!result.success) {
          setFormError(result.error)
          return
        }
        setTestCases((current) => [...current, result.data])
      } else if (editingId) {
        const result = await updateTestCase(editingId, {
          name: formState.name,
          userMessage: formState.userMessage,
          variables,
          checks,
        })
        if (!result.success) {
          setFormError(result.error)
          return
        }
        setTestCases((current) => current.map((item) => (item.id === editingId ? result.data : item)))
      }

      setEditingId(null)
      setFormState(createFormState())
    })
  }

  return (
    <section data-testid="test-case-section" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-serif text-xl">{t("sectionTitle")}</h2>
          <Badge variant="secondary">{t("count", { count: testCases.length })}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={openCreate}>
            {t("newButton")}
          </Button>
        </div>
      </div>

      {testCases.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <div>
              <h3 className="font-serif text-base">{t("emptyTitle")}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("emptyBody")}</p>
            </div>
            <Button size="sm" onClick={openCreate}>
              {t("emptyCta")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {testCases.map((testCase) => {
            const liveResult = runResults[testCase.id]
            const result = liveResult ?? testCase.lastResult
            const isExpanded = expandedIds[testCase.id] ?? Boolean(liveResult)
            const outputExpanded = expandedOutputIds[testCase.id] ?? false
            const fullOutput = result?.output ?? ""
            const previewOutput =
              outputExpanded || fullOutput.length <= 200 ? fullOutput : `${fullOutput.slice(0, 200)}...`

            return (
              <Card key={testCase.id}>
                <CardContent className="space-y-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-serif text-base">{testCase.name}</h3>
                        <Badge variant={result ? (result.success ? "warm" : "destructive") : "secondary"}>
                          {result
                            ? result.success
                              ? t("statusPassed")
                              : t("statusFailed")
                            : t("statusNeverRun")}
                        </Badge>
                        <Badge variant="outline">{t("checks")} {testCase.checks.length}</Badge>
                      </div>
                      {testCase.userMessage ? (
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{testCase.userMessage}</p>
                      ) : null}
                      {!liveResult && testCase.lastRunAt ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {t("lastRun", { time: formatTime(testCase.lastRunAt) ?? testCase.lastRunAt })}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon-sm"
                        onClick={() => void handleRun(testCase.id)}
                        disabled={runningId === testCase.id}
                        aria-label={t("runButton")}
                      >
                        {runningId === testCase.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(testCase)}
                        aria-label={t("editButton")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(testCase.id)}
                        disabled={isPending}
                        aria-label={t("deleteButton")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {result ? (
                    <div className="space-y-3">
                      <Button variant="ghost" size="sm" onClick={() => toggleExpanded(testCase.id)}>
                        {isExpanded ? t("collapse") : t("expand")}
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>

                      {isExpanded ? (
                        <div className="space-y-3 rounded-xl bg-muted/35 p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">{t("output")}</p>
                              {fullOutput.length > 200 ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleOutputExpanded(testCase.id)}
                                >
                                  {outputExpanded ? t("collapse") : t("expand")}
                                </Button>
                              ) : null}
                            </div>
                            <div className="rounded-lg bg-background/70 p-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                              {previewOutput || result.error || "-"}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">{t("checks")}</p>
                            <div className="space-y-2">
                              {result.evaluations.map((evaluation, index) => (
                                <div
                                  key={`${testCase.id}-${index}`}
                                  className="flex items-start gap-2 rounded-lg bg-background/60 px-3 py-2 text-sm"
                                >
                                  {evaluation.passed ? (
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                                  ) : (
                                    <XCircle className="mt-0.5 h-4 w-4 text-destructive" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span>{describeCheck(evaluation.check)}</span>
                                      <Badge variant={evaluation.passed ? "warm" : "destructive"}>
                                        {evaluation.passed ? t("checkPassed") : t("checkFailed")}
                                      </Badge>
                                    </div>
                                    {evaluation.details ? (
                                      <p className="mt-1 text-xs text-muted-foreground">{evaluation.details}</p>
                                    ) : null}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Sheet open={editingId !== null} onOpenChange={closeSheet}>
        <SheetContent side="right" className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editingId === "new" ? t("newButton") : t("editButton")}</SheetTitle>
            <SheetDescription>{t("sectionTitle")}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="space-y-2">
              <label className="mono-label" htmlFor="test-case-name">
                {t("nameLabel")}
              </label>
              <Input
                id="test-case-name"
                value={formState.name}
                onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <label className="mono-label" htmlFor="test-case-user-message">
                {t("userMessageLabel")}
              </label>
              <Textarea
                id="test-case-user-message"
                value={formState.userMessage}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, userMessage: event.target.value }))
                }
                placeholder={t("userMessagePlaceholder")}
                className="min-h-32"
              />
            </div>

            <div className="space-y-2">
              <label className="mono-label" htmlFor="test-case-variables">
                {t("variablesLabel")}
              </label>
              <p className="text-xs text-muted-foreground">{t("variablesHint")}</p>
              <Textarea
                id="test-case-variables"
                value={formState.variablesJson}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, variablesJson: event.target.value }))
                }
                className="min-h-32 font-mono text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="mono-label" htmlFor="test-case-checks">
                {t("checksLabel")}
              </label>
              <p className="text-xs text-muted-foreground">{t("checksHint")}</p>
              <Textarea
                id="test-case-checks"
                value={formState.checksJson}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, checksJson: event.target.value }))
                }
                className="min-h-40 font-mono text-sm"
              />
            </div>

            {formError ? (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => closeSheet(false)}>
              {t("cancelButton")}
            </Button>
            <Button onClick={handleSubmit} disabled={isPending}>
              {t("saveButton")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  )
}
