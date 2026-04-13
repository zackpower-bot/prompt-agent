// Shared constants and types for the memory system.
// All layers (actions, materializer, UI) import from here — no raw strings.

export const MEMORY_TYPES = ["preference", "behavior", "domain", "feedback"] as const
export type MemoryType = (typeof MEMORY_TYPES)[number]

export const EVENT_TYPES = ["explicit_feedback", "edit_diff", "status_change", "reuse_pattern"] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const TRIGGER_TYPES = ["thumbs_up", "thumbs_down", "edit_save", "to_production", "reuse"] as const
export type TriggerType = (typeof TRIGGER_TYPES)[number]

export const EVENT_STATUSES = ["pending", "processing", "processed", "failed"] as const
export type EventStatus = (typeof EVENT_STATUSES)[number]

export const PROFILE_KEYS = ["persona", "style_rules", "default_language"] as const
export type ProfileKey = (typeof PROFILE_KEYS)[number]

export const PROMPT_STATUSES = ["inbox", "production", "archived"] as const
export type PromptStatus = (typeof PROMPT_STATUSES)[number]

// Decay factors per memory type (applied as confidence × factor^days)
export const DECAY_FACTORS: Record<MemoryType, number> = {
  preference: 0.995, // ~180 days to 0.41
  behavior: 0.995,
  domain: 0.98, // ~30 days to 0.55
  feedback: 1.0, // no decay
}

// Max memories per type in retrieval
export const RETRIEVAL_BUDGET: Record<MemoryType, number> = {
  preference: 3,
  behavior: 2,
  domain: 2,
  feedback: 3,
}

// Minimum confidence to be included in retrieval
export const MIN_CONFIDENCE = 0.3

// Max character length for a single memory injected into prompt
export const MAX_MEMORY_INJECTION_LENGTH = 300

// Cosine similarity thresholds
export const AUDN_SIMILARITY_THRESHOLD = 0.75
