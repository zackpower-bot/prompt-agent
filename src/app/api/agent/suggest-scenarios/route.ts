import { NextRequest, NextResponse } from "next/server"

import { retrieveScenariosForGoal } from "@/lib/compiler/retrieve"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { content, topK } = body as { content?: string; topK?: number }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const result = await retrieveScenariosForGoal(content, topK ?? 3)
  return NextResponse.json(result)
}
