"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Search, Plus, Loader2 } from "lucide-react"

import { createScenario, type ScenarioRecord } from "@/app/actions/scenario.actions"
import { Link } from "@/i18n/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface SuggestMatch {
  scenario: {
    id: string
    name: string
    description: string
    similarity: number
  }
  recipes: Array<{
    id: string
    name: string
    description: string
    quality: number | null
  }>
}

interface SuggestResponse {
  query: { description: string; hasEmbedding: boolean }
  matches: SuggestMatch[]
}

type SearchState =
  | { status: "idle" }
  | { status: "pending"; query: string }
  | { status: "success"; query: string; hasEmbedding: boolean; matches: SuggestMatch[] }
  | { status: "error"; message: string }

type DisplayScenario = {
  id: string
  name: string
  description: string
  recipeCount: number
  similarity: number | null
}

interface ScenariosClientProps {
  initialScenarios: ScenarioRecord[]
}

const SEARCH_DEBOUNCE_MS = 500
const SEARCH_TOP_K = 10

function sortByUpdatedAt(records: ScenarioRecord[]): ScenarioRecord[] {
  return [...records].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
}

export function ScenariosClient({ initialScenarios }: ScenariosClientProps) {
  const tScenarios = useTranslations("scenarios")
  const tCommon = useTranslations("common")

  const [scenarios, setScenarios] = useState(() => sortByUpdatedAt(initialScenarios))
  const [searchValue, setSearchValue] = useState("")
  const [searchState, setSearchState] = useState<SearchState>({ status: "idle" })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [isCreating, startTransition] = useTransition()

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setScenarios(sortByUpdatedAt(initialScenarios))
  }, [initialScenarios])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
    }
  }, [])

  const resetSearchState = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (controllerRef.current) {
      controllerRef.current.abort()
      controllerRef.current = null
    }
    setSearchState({ status: "idle" })
  }, [])

  const triggerSearch = useCallback(
    (query: string) => {
      if (!query) return
      if (controllerRef.current) {
        controllerRef.current.abort()
      }
      const controller = new AbortController()
      controllerRef.current = controller
      setSearchState({ status: "pending", query })

      void (async () => {
        try {
          const response = await fetch("/api/recipes/suggest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ description: query, topK: SEARCH_TOP_K }),
            signal: controller.signal,
          })
          if (!response.ok) throw new Error("Failed to fetch suggestions")
          const data = (await response.json()) as SuggestResponse
          setSearchState({
            status: "success",
            query,
            hasEmbedding: data.query.hasEmbedding,
            matches: data.matches,
          })
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") return
          console.error("Failed to search scenarios", error)
          setSearchState({ status: "error", message: tScenarios("searchError") })
        }
      })()
    },
    [tScenarios]
  )

  const handleSearchChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value
      setSearchValue(value)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      const trimmed = value.trim()
      if (!trimmed) {
        resetSearchState()
        return
      }
      debounceRef.current = setTimeout(() => {
        triggerSearch(trimmed)
      }, SEARCH_DEBOUNCE_MS)
    },
    [resetSearchState, triggerSearch]
  )

  const handleSearchSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmed = searchValue.trim()
      if (!trimmed) {
        if (searchValue) {
          setSearchValue("")
        }
        resetSearchState()
        return
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        debounceRef.current = null
      }
      triggerSearch(trimmed)
    },
    [resetSearchState, searchValue, triggerSearch]
  )

  const handleClearSearch = useCallback(() => {
    setSearchValue("")
    resetSearchState()
  }, [resetSearchState])

  const upsertScenario = useCallback((record: ScenarioRecord) => {
    setScenarios((prev) => {
      const next = [record, ...prev.filter((scenario) => scenario.id !== record.id)]
      return sortByUpdatedAt(next)
    })
  }, [])

  const handleCreateScenario = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      const trimmedName = name.trim()
      if (!trimmedName) {
        setFormError(tScenarios("nameRequired"))
        return
      }
      const trimmedDescription = description.trim()
      setFormError(null)
      startTransition(async () => {
        const result = await createScenario({ name: trimmedName, description: trimmedDescription })
        if (!result.success) {
          const message = result.error || tScenarios("createError")
          setFormError(message)
          toast.error(message)
          return
        }
        upsertScenario(result.data)
        setName("")
        setDescription("")
        setShowCreateForm(false)
        handleClearSearch()
      })
    },
    [description, handleClearSearch, name, startTransition, tScenarios, upsertScenario]
  )

  const sortedScenarios = useMemo(() => sortByUpdatedAt(scenarios), [scenarios])
  const isShowingMatches =
    searchState.status === "success" && searchState.hasEmbedding && searchState.matches.length > 0

  const displayScenarios: DisplayScenario[] = useMemo(() => {
    if (isShowingMatches && searchState.status === "success") {
      return [...searchState.matches]
        .sort((a, b) => b.scenario.similarity - a.scenario.similarity)
        .map((match) => ({
          id: match.scenario.id,
          name: match.scenario.name,
          description: match.scenario.description,
          recipeCount: match.recipes.length,
          similarity: match.scenario.similarity,
        }))
    }
    return sortedScenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      recipeCount: scenario.recipeCount,
      similarity: null,
    }))
  }, [isShowingMatches, searchState, sortedScenarios])

  const searchIndicator = useMemo(() => {
    if (searchState.status === "success") {
      if (!searchState.hasEmbedding) {
        return tScenarios("searchNoEmbedding")
      }
      if (searchState.matches.length === 0) {
        return tScenarios("searchNoMatches", { query: searchState.query })
      }
    }
    if (searchState.status === "error") {
      return searchState.message
    }
    return null
  }, [searchState, tScenarios])

  const isSearching = searchState.status === "pending"

  const renderDescription = useCallback(
    (value: string) => {
      const trimmed = value?.trim()
      if (!trimmed) return tScenarios("noDescription")
      return trimmed
    },
    [tScenarios]
  )

  const formatSimilarity = useCallback(
    (value: number) => `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`,
    []
  )

  return (
    <div className="container-reading">
      <div className="flex flex-col gap-6">
        <header className="sticky top-0 z-10 bg-background/80 py-3 backdrop-blur">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={handleSearchChange}
                placeholder={tScenarios("searchPlaceholder")}
                className="pl-10"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            {(searchValue || searchState.status !== "idle") && (
              <Button type="button" variant="ghost" onClick={handleClearSearch}>
                {tCommon("reset")}
              </Button>
            )}
            <Button
              onClick={() => setShowCreateForm((prev) => !prev)}
              aria-expanded={showCreateForm}
              className="shrink-0"
            >
              {isCreating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {tScenarios("newScenario")}
            </Button>
          </form>
        </header>

        {searchIndicator && (
          <p className="text-sm text-muted-foreground">{searchIndicator}</p>
        )}

        {showCreateForm && (
          <form
            onSubmit={handleCreateScenario}
            className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="scenario-name">
                {tScenarios("name")}
              </label>
              <Input
                id="scenario-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (formError) setFormError(null)
                }}
                aria-invalid={Boolean(formError && !name.trim())}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="scenario-description">
                {tScenarios("description")}
              </label>
              <Textarea
                id="scenario-description"
                value={description}
                rows={4}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowCreateForm(false)
                  setName("")
                  setDescription("")
                  setFormError(null)
                }}
              >
                {tCommon("reset")}
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {tScenarios("newScenario")}
              </Button>
            </div>
          </form>
        )}

        {displayScenarios.length > 0 ? (
          <ul className="space-y-1">
            {displayScenarios.map((scenario) => (
              <li key={scenario.id}>
                <Link href={`/scenarios/${scenario.id}`} className="list-row">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-serif text-base">{scenario.name}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {renderDescription(scenario.description)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    {scenario.similarity !== null && (
                      <Badge className="bg-agent/15 text-agent">
                        {formatSimilarity(scenario.similarity)}
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[11px]">
                      {tScenarios("recipeCount", { count: scenario.recipeCount })}
                    </Badge>
                    <time className="text-xs text-muted-foreground">
                      {sortedScenarios.find((item) => item.id === scenario.id)?.updatedAt
                        ? new Date(sortedScenarios.find((item) => item.id === scenario.id)!.updatedAt).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
                        : ""}
                    </time>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
            <h2 className="text-xl">{tScenarios("title")}</h2>
            <p className="max-w-[38rem] text-sm leading-7 text-muted-foreground">{tScenarios("emptyList")}</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              {tScenarios("newScenario")}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
