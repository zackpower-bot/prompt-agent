import { NextResponse } from "next/server"

import {
  recordEntityUsage,
  type EntityType,
  type UsageAction,
} from "@/lib/entity-usage"

export const runtime = "nodejs"

const VALID_ENTITY_TYPES = new Set<EntityType>(["prompt", "module", "recipe"])
const VALID_ACTIONS = new Set<UsageAction>([
  "execute",
  "test_run",
  "assemble",
  "copy",
  "reference",
  "view",
])

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const entityType = typeof body?.entityType === "string" ? body.entityType : ""
    const entityId = typeof body?.entityId === "string" ? body.entityId : ""
    const action = typeof body?.action === "string" ? body.action : ""
    const context = typeof body?.context === "string" ? body.context : undefined

    if (!VALID_ENTITY_TYPES.has(entityType as EntityType) || !entityId || !VALID_ACTIONS.has(action as UsageAction)) {
      return NextResponse.json({ error: "Invalid usage payload" }, { status: 400 })
    }

    await recordEntityUsage({
      entityType: entityType as EntityType,
      entityId,
      action: action as UsageAction,
      context,
    })

    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }
}
