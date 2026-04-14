import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { parseAlertMetadata } from "@/lib/alerts"

export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { acknowledged } = body as { acknowledged?: boolean }
  if (acknowledged !== true) {
    return NextResponse.json({ error: "acknowledged must be true" }, { status: 400 })
  }

  try {
    const alert = await prisma.alert.update({
      where: { id },
      data: { acknowledged: true, acknowledgedAt: new Date() },
    })

    return NextResponse.json({
      alert: {
        ...alert,
        metadata: parseAlertMetadata(alert.metadata),
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 })
    }
    throw error
  }
}
