import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runTestCase } from "@/lib/test-case"
import type { ProviderName } from "@/lib/providers"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const promptId = typeof body?.promptId === "string" ? body.promptId : undefined
    const preferredChain = Array.isArray(body?.preferredChain)
      ? (body.preferredChain as Array<{ provider: ProviderName; model?: string }>)
      : undefined
    if (!promptId) {
      return NextResponse.json({ error: "promptId is required" }, { status: 400 })
    }

    const pairs = await prisma.testCase.findMany({
      where: { promptId },
      include: { prompt: true },
      orderBy: { createdAt: "asc" },
    })

    if (!pairs.length) {
      return NextResponse.json({ error: "No test cases for prompt" }, { status: 404 })
    }

    const results = []
    for (const testCase of pairs) {
      results.push(await runTestCase(testCase, { preferredChain }))
    }

    const passed = results.filter((result) => result.success).length
    return NextResponse.json({
      promptId,
      total: results.length,
      passed,
      failed: results.length - passed,
      results,
    })
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
