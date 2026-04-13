import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const prompts = await prisma.prompt.findMany({
      include: { tags: { include: { tag: true } } },
      orderBy: { updatedAt: "desc" },
    })

    const data = prompts.map((p) => ({
      title: p.title,
      description: p.description,
      content: p.content,
      category: p.category,
      model: p.model,
      status: p.status,
      tags: p.tags.map((pt) => pt.tag.name),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="prompt-agent-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
