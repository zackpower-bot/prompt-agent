import { NextResponse } from "next/server"

import {
  getUsageForEntities,
  getTopUsedEntities,
  getUsageForEntity,
  type EntityType,
} from "@/lib/entity-usage"

export const runtime = "nodejs"

const VALID_TYPES = new Set<EntityType>(["prompt", "module", "recipe"])

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")
  const id = searchParams.get("id")
  const ids = searchParams.get("ids")

  if (!type || !VALID_TYPES.has(type as EntityType)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 })
  }

  const entityType = type as EntityType

  if (id) {
    const stats = await getUsageForEntity(entityType, id)
    return NextResponse.json(stats)
  }

  if (ids) {
    const counts = await getUsageForEntities(
      entityType,
      ids.split(",").map((value) => value.trim()).filter(Boolean)
    )
    return NextResponse.json({ counts })
  }

  const top = await getTopUsedEntities(entityType)
  return NextResponse.json({ top })
}
