import { CORE_SLOTS, isValidSlot, type Slot } from "./slots"

export interface RecipeHealth {
  status: "healthy" | "partial" | "draft" | "unclassified"
  coveredCoreSlots: Slot[]
  missingCoreSlots: Slot[]
  totalSteps: number
  classifiedSteps: number
}

export function evaluateRecipeHealth(input: {
  templateType: string | null | undefined
  steps: Array<{ moduleSlot: string | null; isInline: boolean }>
}): RecipeHealth {
  const moduleSlots = input.steps
    .map((step) => step.moduleSlot)
    .filter((slot): slot is Slot => isValidSlot(slot))
  const coveredSet = new Set(moduleSlots)
  const coveredCoreSlots = CORE_SLOTS.filter((slot) => coveredSet.has(slot))
  const missingCoreSlots = CORE_SLOTS.filter((slot) => !coveredSet.has(slot))
  const totalSteps = input.steps.length
  const classifiedSteps = moduleSlots.length

  let status: RecipeHealth["status"]
  if (!input.templateType) {
    status = "unclassified"
  } else if (missingCoreSlots.length === 0 && totalSteps > 0) {
    status = "healthy"
  } else if (missingCoreSlots.length <= 2) {
    status = "partial"
  } else {
    status = "draft"
  }

  return { status, coveredCoreSlots, missingCoreSlots, totalSteps, classifiedSteps }
}
