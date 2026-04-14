import type { Prompt, TestCase } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { logUsage } from "@/lib/usage"
import {
  PROVIDER_CONFIGS,
  createClient,
  getDefaultProvider,
  type ProviderName,
} from "@/lib/providers"

const EXECUTION_SYSTEM_PROMPT = `You are executing a stored prompt for regression testing.
The upcoming user content already contains the full instructions with resolved variables.
Respond exactly as the prompt dictates.`

export type VariablesMap = Record<string, unknown>

export type Check =
  | { kind: "contains"; value: string; caseSensitive?: boolean; label?: string }
  | { kind: "not_contains"; value: string; caseSensitive?: boolean; label?: string }
  | { kind: "equals"; value: string; caseSensitive?: boolean; label?: string }
  | { kind: "starts_with"; value: string; caseSensitive?: boolean; label?: string }
  | { kind: "ends_with"; value: string; caseSensitive?: boolean; label?: string }
  | { kind: "length"; min?: number; max?: number; label?: string }
  | { kind: "regex"; pattern: string; flags?: string; label?: string }
  | {
      kind: "json_path"
      path: string
      equals?: unknown
      contains?: unknown
      exists?: boolean
      label?: string
    }

export interface CheckEvaluation {
  check: Check
  passed: boolean
  details?: string
}

export interface StoredRunResult {
  ranAt: string
  provider: string
  model: string
  success: boolean
  output: string | null
  evaluations: CheckEvaluation[]
  error?: string
}

export interface TestCaseDTO {
  id: string
  promptId: string
  variables: VariablesMap
  expectation: string | null
  checks: Check[]
  lastRunAt: string | null
  lastResult: StoredRunResult | null
  createdAt: string
  updatedAt: string
}

export interface TestCaseRunResult extends StoredRunResult {
  testCaseId: string
  promptId: string
  expectation: string | null
  variables: VariablesMap
  startedAt: string
  finishedAt: string
}

export interface RunTestCaseOptions {
  provider?: ProviderName
  model?: string
  temperature?: number
  maxTokens?: number
  persistResult?: boolean
}

const DEFAULT_FAILURE_EVALUATION: CheckEvaluation[] = []

const EMPTY_OBJECT: VariablesMap = {}

export function parseVariables(raw: string | null): VariablesMap {
  if (!raw) return { ...EMPTY_OBJECT }
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return { ...EMPTY_OBJECT }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [key, value])
    )
  } catch {
    return { ...EMPTY_OBJECT }
  }
}

function normalizeVariables(vars?: VariablesMap | null): VariablesMap {
  if (!vars || typeof vars !== "object") return { ...EMPTY_OBJECT }
  return Object.fromEntries(
    Object.entries(vars).filter(([key]) => typeof key === "string")
  )
}

export function stringifyVariables(vars?: VariablesMap | null): string {
  return JSON.stringify(normalizeVariables(vars))
}

function isCheck(candidate: unknown): candidate is Check {
  if (!candidate || typeof candidate !== "object") return false
  const kind = (candidate as { kind?: unknown }).kind
  if (typeof kind !== "string") return false
  switch (kind) {
    case "contains":
    case "not_contains":
    case "equals":
    case "starts_with":
    case "ends_with":
      return typeof (candidate as { value?: unknown }).value === "string"
    case "length":
      return true
    case "regex":
      return typeof (candidate as { pattern?: unknown }).pattern === "string"
    case "json_path":
      return typeof (candidate as { path?: unknown }).path === "string"
    default:
      return false
  }
}

export function parseChecks(raw: string | null): Check[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isCheck)
  } catch {
    return []
  }
}

function normalizeChecks(checks?: Check[] | null): Check[] {
  if (!checks) return []
  return checks.filter(isCheck)
}

export function stringifyChecks(checks?: Check[] | null): string {
  return JSON.stringify(normalizeChecks(checks))
}

export function formatStoredRunResult(raw: string | null): StoredRunResult | null {
  if (!raw) return null
  try {
    const data = JSON.parse(raw) as StoredRunResult
    if (!data || typeof data !== "object") return null
    if (typeof data.ranAt !== "string") return null
    return data
  } catch {
    return null
  }
}

export function serializeTestCase(row: TestCase): TestCaseDTO {
  return {
    id: row.id,
    promptId: row.promptId,
    variables: parseVariables(row.variables),
    expectation: row.expectation ?? null,
    checks: parseChecks(row.checks),
    lastRunAt: row.lastRunAt?.toISOString() ?? null,
    lastResult: formatStoredRunResult(row.lastResult) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

function caseApply(value: string, caseSensitive?: boolean): string {
  return caseSensitive ? value : value.toLowerCase()
}

function evaluateContains(output: string, check: Extract<Check, { kind: "contains" | "not_contains" }>): CheckEvaluation {
  const haystack = caseApply(output, check.caseSensitive)
  const needle = caseApply(check.value, check.caseSensitive)
  const included = haystack.includes(needle)
  const passed = check.kind === "contains" ? included : !included
  return {
    check,
    passed,
    details: passed ? undefined : `Expected output to ${check.kind === "contains" ? "" : "not "}contain "${check.value}"`,
  }
}

function evaluateEquals(output: string, check: Extract<Check, { kind: "equals" }>): CheckEvaluation {
  const left = caseApply(output, check.caseSensitive)
  const right = caseApply(check.value, check.caseSensitive)
  const passed = left === right
  return {
    check,
    passed,
    details: passed ? undefined : `Expected equality with "${check.value}"`,
  }
}

function evaluateEdgeMatch(
  output: string,
  check: Extract<Check, { kind: "starts_with" | "ends_with" }>
): CheckEvaluation {
  const haystack = caseApply(output, check.caseSensitive)
  const needle = caseApply(check.value, check.caseSensitive)
  const passed =
    check.kind === "starts_with" ? haystack.startsWith(needle) : haystack.endsWith(needle)
  return {
    check,
    passed,
    details: passed ? undefined : `Expected output to ${check.kind.replace("_", " ")} "${check.value}"`,
  }
}

function evaluateLength(output: string, check: Extract<Check, { kind: "length" }>): CheckEvaluation {
  const len = output.length
  if (typeof check.min === "number" && len < check.min) {
    return { check, passed: false, details: `Length ${len} < min ${check.min}` }
  }
  if (typeof check.max === "number" && len > check.max) {
    return { check, passed: false, details: `Length ${len} > max ${check.max}` }
  }
  return { check, passed: true }
}

function evaluateRegex(output: string, check: Extract<Check, { kind: "regex" }>): CheckEvaluation {
  try {
    const regex = new RegExp(check.pattern, check.flags)
    const passed = regex.test(output)
    return {
      check,
      passed,
      details: passed ? undefined : `Regex /${check.pattern}/${check.flags ?? ""} did not match`,
    }
  } catch (error) {
    return {
      check,
      passed: false,
      details: (error as Error).message || "Invalid regex",
    }
  }
}

function getJsonPathValue(payload: unknown, path: string): unknown {
  const normalized = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean)

  let current: unknown = payload
  for (const segment of normalized) {
    if (current === null || current === undefined) return undefined
    if (Array.isArray(current)) {
      const index = Number(segment)
      if (!Number.isInteger(index)) return undefined
      current = current[index]
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }
  return current
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (typeof a === "object" && typeof b === "object" && a && b) {
    const keysA = Object.keys(a as Record<string, unknown>)
    const keysB = Object.keys(b as Record<string, unknown>)
    if (keysA.length !== keysB.length) return false
    return keysA.every((key) => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]))
  }
  return false
}

function evaluateJsonPath(output: string, check: Extract<Check, { kind: "json_path" }>): CheckEvaluation {
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch {
    return { check, passed: false, details: "Output is not valid JSON" }
  }

  const target = getJsonPathValue(parsed, check.path)
  if (check.exists) {
    const passed = target !== undefined && target !== null
    if (!passed) {
      return { check, passed: false, details: `Path ${check.path} missing` }
    }
  }

  if ("equals" in check && check.equals !== undefined) {
    const passed = deepEqual(target, check.equals)
    if (!passed) {
      return {
        check,
        passed: false,
        details: `Expected ${JSON.stringify(check.equals)}, received ${JSON.stringify(target)}`,
      }
    }
  }

  if ("contains" in check && check.contains !== undefined) {
    if (typeof target === "string" && typeof check.contains === "string") {
      const haystack = target.toLowerCase()
      const needle = check.contains.toLowerCase()
      if (!haystack.includes(needle)) {
        return {
          check,
          passed: false,
          details: `Expected "${check.contains}" inside string`,
        }
      }
    } else if (Array.isArray(target)) {
      const passed = target.some((value) => deepEqual(value, check.contains))
      if (!passed) {
        return {
          check,
          passed: false,
          details: `Expected array to include ${JSON.stringify(check.contains)}`,
        }
      }
    } else {
      return {
        check,
        passed: false,
        details: "contains expects string or array target",
      }
    }
  }

  return { check, passed: true }
}

export function evaluateChecks(output: string, checks: Check[]): CheckEvaluation[] {
  if (!checks?.length) return []
  return checks.map((check) => {
    switch (check.kind) {
      case "contains":
      case "not_contains":
        return evaluateContains(output, check)
      case "equals":
        return evaluateEquals(output, check)
      case "starts_with":
      case "ends_with":
        return evaluateEdgeMatch(output, check)
      case "length":
        return evaluateLength(output, check)
      case "regex":
        return evaluateRegex(output, check)
      case "json_path":
        return evaluateJsonPath(output, check)
      default:
        return { check, passed: true }
    }
  })
}

export function interpolateVariables(template: string, variables: VariablesMap): string {
  const scope = normalizeVariables(variables)
  return template.replace(/{{\s*([\w.-]+)\s*}}/g, (_, key: string) => {
    const value = scope[key]
    if (value === undefined || value === null) return ""
    if (typeof value === "string") return value
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    return JSON.stringify(value)
  })
}

function resolveModel(requestedModel: string | undefined, promptModel: string | null, provider: ProviderName): string {
  if (requestedModel) return requestedModel
  if (promptModel) {
    const normalized = promptModel.trim().toLowerCase()
    if (normalized && !["universal", "general"].includes(normalized)) {
      return promptModel
    }
  }
  return PROVIDER_CONFIGS[provider].defaultModel
}

function toStoredRunResult(result: TestCaseRunResult): StoredRunResult {
  return {
    ranAt: result.finishedAt,
    provider: result.provider,
    model: result.model,
    success: result.success,
    output: result.output,
    evaluations: result.evaluations,
    error: result.error,
  }
}

async function persistRunResult(
  testCaseId: string,
  promptId: string,
  finishedAt: Date,
  stored: StoredRunResult
) {
  await prisma.$transaction(async (tx) => {
    await tx.testCase.update({
      where: { id: testCaseId },
      data: {
        lastRunAt: finishedAt,
        lastResult: JSON.stringify(stored),
      },
    })
    await tx.prompt.update({
      where: { id: promptId },
      data: { lastUsedAt: finishedAt },
    })
  }).catch((error) => {
    if (process.env.NODE_ENV !== "production") {
      console.warn("persistRunResult failed", error)
    }
  })
}

function buildResultPayload(params: {
  testCase: TestCase & { prompt: Prompt }
  variables: VariablesMap
  startedAt: Date
  finishedAt: Date
  provider: ProviderName
  model: string
  evaluations: CheckEvaluation[]
  output: string | null
  error?: string
}): TestCaseRunResult {
  const { testCase, variables, startedAt, finishedAt, provider, model, evaluations, output, error } = params
  const success = error ? false : evaluations.every((item) => item.passed)
  return {
    testCaseId: testCase.id,
    promptId: testCase.promptId,
    expectation: testCase.expectation ?? null,
    variables,
    ranAt: finishedAt.toISOString(),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    provider,
    model,
    output,
    evaluations,
    success,
    error,
  }
}

function logFailure(provider: ProviderName, model: string, error: unknown) {
  return logUsage({
    service: "llm",
    provider,
    model,
    success: false,
    errorCode: error instanceof Error ? error.message : String(error),
  })
}

export async function runTestCase(
  testCase: TestCase & { prompt: Prompt },
  options?: RunTestCaseOptions
): Promise<TestCaseRunResult> {
  const variables = parseVariables(testCase.variables)
  const checks = parseChecks(testCase.checks)
  const provider = options?.provider ?? getDefaultProvider()
  const model = resolveModel(options?.model, testCase.prompt.model, provider)
  const client = createClient(provider)

  if (!client) {
    const now = new Date()
    const result = buildResultPayload({
      testCase,
      variables,
      startedAt: now,
      finishedAt: now,
      provider,
      model,
      evaluations: DEFAULT_FAILURE_EVALUATION,
      output: null,
      error: `${PROVIDER_CONFIGS[provider].label} API key not configured`,
    })
    if (options?.persistResult !== false) {
      await persistRunResult(testCase.id, testCase.promptId, now, toStoredRunResult(result))
    }
    return result
  }

  const assembledPrompt = interpolateVariables(testCase.prompt.content, variables)
  const startedAt = new Date()

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens ?? 800,
      messages: [
        { role: "system", content: EXECUTION_SYSTEM_PROMPT },
        { role: "user", content: assembledPrompt },
      ],
    })

    const finishedAt = new Date()
    const output =
      completion.choices?.[0]?.message?.content?.toString().trim() ?? ""
    const evaluations = evaluateChecks(output, checks)
    const result = buildResultPayload({
      testCase,
      variables,
      startedAt,
      finishedAt,
      provider,
      model,
      evaluations,
      output,
    })

    await logUsage({
      service: "llm",
      provider,
      model,
      inputTokens: completion.usage?.prompt_tokens ?? undefined,
      outputTokens: completion.usage?.completion_tokens ?? undefined,
    })

    if (options?.persistResult !== false) {
      await persistRunResult(testCase.id, testCase.promptId, finishedAt, toStoredRunResult(result))
    }

    return result
  } catch (error) {
    await logFailure(provider, model, error)
    const finishedAt = new Date()
    const result = buildResultPayload({
      testCase,
      variables,
      startedAt,
      finishedAt,
      provider,
      model,
      evaluations: DEFAULT_FAILURE_EVALUATION,
      output: null,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    if (options?.persistResult !== false) {
      await persistRunResult(testCase.id, testCase.promptId, finishedAt, toStoredRunResult(result))
    }
    return result
  }
}
