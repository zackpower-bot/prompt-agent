import { NextResponse } from "next/server"
import { generateMonthlyReport } from "@/lib/reports/monthly"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const endDate = body && typeof body.endDate === "string" ? body.endDate : undefined

  try {
    const report = await generateMonthlyReport(endDate)
    return NextResponse.json({ path: report.path, summary: report.summary })
  } catch (error) {
    if ((error as Error).message === "Invalid endDate") {
      return NextResponse.json({ error: "Invalid endDate" }, { status: 400 })
    }
    console.error("[reports:monthly] Failed to generate report", error)
    return NextResponse.json({ error: "Failed to generate monthly report" }, { status: 500 })
  }
}
