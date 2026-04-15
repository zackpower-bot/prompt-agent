import { NextRequest, NextResponse } from "next/server"

import { retrieveModulesForGoal } from "@/lib/compiler/retrieve"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { goal, topK } = body as { goal?: string; topK?: number }

  if (!goal?.trim()) {
    return NextResponse.json({ error: "Goal is required" }, { status: 400 })
  }

  const result = await retrieveModulesForGoal(goal, topK ?? 10)
  return NextResponse.json(result)
}
