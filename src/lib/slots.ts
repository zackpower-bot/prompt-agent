export const SLOTS = [
  "role",
  "task",
  "context",
  "constraints",
  "output",
  "variables",
  "examples",
  "process",
  "checks",
  "tools",
  "state",
] as const

export type Slot = (typeof SLOTS)[number]

export const CORE_SLOTS: readonly Slot[] = [
  "role",
  "task",
  "context",
  "constraints",
  "output",
  "variables",
]

export const ADVANCED_SLOTS: readonly Slot[] = ["examples", "process", "checks"]
export const AGENT_SLOTS: readonly Slot[] = ["tools", "state"]

export const SLOT_LABELS: Record<Slot, string> = {
  role: "角色",
  task: "任务",
  context: "上下文",
  constraints: "约束",
  output: "输出格式",
  variables: "变量",
  examples: "示例",
  process: "步骤",
  checks: "自检",
  tools: "工具",
  state: "状态",
}

export const SLOT_GROUP: Record<Slot, "core" | "advanced" | "agent"> = {
  role: "core",
  task: "core",
  context: "core",
  constraints: "core",
  output: "core",
  variables: "core",
  examples: "advanced",
  process: "advanced",
  checks: "advanced",
  tools: "agent",
  state: "agent",
}

export function isValidSlot(s: string | null | undefined): s is Slot {
  return !!s && (SLOTS as readonly string[]).includes(s)
}
