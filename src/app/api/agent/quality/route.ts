import { NextRequest, NextResponse } from "next/server"
import { ANALYSIS_DEFAULT_CHAIN } from "@/lib/available-models"
import { assessQuality } from "@/lib/quality-gate"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { content, title } = body as { content: string; title?: string }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const assessment = await assessQuality(content, title, { preferredChain: ANALYSIS_DEFAULT_CHAIN })
  return NextResponse.json(assessment)
}
