import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { runTestCase } from "@/lib/test-case"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const id = typeof body?.id === "string" ? body.id : undefined
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const testCase = await prisma.testCase.findUnique({
      where: { id },
      include: { prompt: true },
    })

    if (!testCase || !testCase.prompt) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 })
    }

    const result = await runTestCase(testCase)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
