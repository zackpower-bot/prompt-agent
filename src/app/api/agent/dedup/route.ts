import { NextRequest, NextResponse } from "next/server"
import { findDuplicates } from "@/lib/dedup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { title, content, excludeId } = body as {
    title: string
    content: string
    excludeId?: string
  }

  if (!content?.trim()) {
    return NextResponse.json({ error: "Content is required" }, { status: 400 })
  }

  const duplicates = await findDuplicates(title ?? "", content, excludeId)
  return NextResponse.json({ duplicates, hasDuplicates: duplicates.length > 0 })
}
