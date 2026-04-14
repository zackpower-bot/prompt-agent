import { promises as fs } from "node:fs"
import path from "node:path"

export type ReportKind = "weekly" | "monthly"

export const REPORTS_ROOT = path.join(process.cwd(), "reports")
export const REPORTS_WEEKLY_DIR = path.join(REPORTS_ROOT, "weekly")
export const REPORTS_MONTHLY_DIR = path.join(REPORTS_ROOT, "monthly")

export async function ensureReportsDir(kind?: ReportKind): Promise<string> {
  const target = kind === "weekly"
    ? REPORTS_WEEKLY_DIR
    : kind === "monthly"
      ? REPORTS_MONTHLY_DIR
      : REPORTS_ROOT
  await fs.mkdir(target, { recursive: true })
  return target
}

export function formatDateRange(start: Date, end: Date, options?: { includeWeekday?: boolean }): string {
  const localeOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }
  const formatter = new Intl.DateTimeFormat("zh-CN", localeOptions)
  const startText = formatter.format(start)
  const endText = formatter.format(end)

  if (!options?.includeWeekday) {
    return `${startText} ~ ${endText}`
  }

  const weekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    timeZone: "UTC",
  })
  return `${startText} (${weekdayFormatter.format(start)}) ~ ${endText} (${weekdayFormatter.format(end)})`
}

export function markdownTable(headers: string[], rows: Array<Array<string | number | null | undefined>>): string {
  if (!headers.length) return ""
  const safeRows = rows.length
    ? rows
    : [headers.map(() => "—")]
  const rowsString = safeRows
    .map(
      (row) =>
        `| ${row
          .map((value) => (value === null || value === undefined ? "—" : String(value).replace(/\n+/g, " ")))
          .join(" | ")} |`,
    )
    .join("\n")
  const header = `| ${headers.join(" | ")} |`
  const separator = `| ${headers.map(() => "---").join(" | ")} |`
  return `${header}\n${separator}\n${rowsString}`
}

export function weekNumber(dateInput: Date | string): { year: number; week: number; label: string } {
  const date = new Date(dateInput)
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNumber = target.getUTCDay() || 7
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber)
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1))
  const diff = target.getTime() - yearStart.getTime()
  const week = Math.ceil(((diff / 86400000) + 1) / 7)
  const year = target.getUTCFullYear()
  return {
    year,
    week,
    label: `${year}-W${String(week).padStart(2, "0")}`,
  }
}
