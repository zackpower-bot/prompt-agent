"use client"

import { useCallback, useEffect, useState } from "react"

import { DEFAULT_CHAIN, type ModelChainEntry } from "@/lib/available-models"

const STORAGE_KEY = "prompt-agent.model-chain.v1"

function readStored(): ModelChainEntry[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    const valid = parsed.filter(
      (entry): entry is ModelChainEntry =>
        Boolean(entry) &&
        typeof entry.provider === "string" &&
        typeof entry.model === "string"
    )
    return valid.length > 0 ? valid : null
  } catch {
    return null
  }
}

export function useModelChain() {
  const [chain, setChainState] = useState<ModelChainEntry[]>(() => readStored() ?? DEFAULT_CHAIN)

  useEffect(() => {
    const stored = readStored()
    if (stored) {
      setChainState(stored)
    }
  }, [])

  const setChain = useCallback((next: ModelChainEntry[]) => {
    setChainState(next)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }, [])

  const reset = useCallback(() => {
    setChain(DEFAULT_CHAIN)
  }, [setChain])

  return { chain, setChain, reset }
}
