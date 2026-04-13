import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { findDuplicates } from "@/lib/dedup"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

interface ImportPrompt {
  title: string
  description?: string
  content: string
  category?: string
  model?: string
  status?: string
  tags?: string[]
}

export async function POST(request: NextRequest) {
  try {
    const data = (await request.json()) as ImportPrompt[]
    if (!Array.isArray(data)) {
      return NextResponse.json({ error: "Expected JSON array" }, { status: 400 })
    }

    let imported = 0
    let skipped = 0
    for (const item of data) {
      if (!item.title || !item.content) continue

      const duplicates = await findDuplicates(item.title, item.content)
      if (duplicates.length > 0) {
        skipped++
        continue
      }

      const tagNames = (item.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean)
      const tagRecords = await Promise.all(
        tagNames.map((name) =>
          prisma.tag.upsert({ where: { name }, update: {}, create: { name } })
        )
      )

      await prisma.prompt.create({
        data: {
          title: item.title,
          description: item.description ?? "",
          content: item.content,
          category: item.category ?? "general",
          model: item.model ?? "universal",
          status: item.status ?? "inbox",
          tags: {
            create: tagRecords.map((tag) => ({
              tag: { connect: { id: tag.id } },
            })),
          },
        },
      })
      imported++
    }

    return NextResponse.json({ imported, skipped, total: data.length })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
