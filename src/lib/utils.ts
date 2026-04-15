import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function summarizeText(text: string, maxLength = 240): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  })
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

function summarizeResponsePreview(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim()
  if (!normalized) return "<empty>"
  return normalized.slice(0, 200)
}

export async function readErrorResponse(
  response: Response,
  fallback = `HTTP ${response.status}`,
): Promise<string> {
  const contentType = response.headers.get("content-type") ?? ""

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      const payload = (await response.json()) as { error?: unknown; message?: unknown }
      if (typeof payload?.error === "string" && payload.error.trim()) return payload.error
      if (typeof payload?.message === "string" && payload.message.trim()) return payload.message
    } catch {
      return fallback
    }
    return fallback
  }

  const preview = summarizeResponsePreview(await response.text())
  return `非 JSON 响应（HTTP ${response.status}，${contentType || "unknown"}）：${preview}`
}

export async function parseJsonResponseOrThrow<T>(
  response: Response,
  fallback = `HTTP ${response.status}`,
): Promise<T> {
  if (!response.ok) {
    throw new Error(await readErrorResponse(response, fallback))
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    const preview = summarizeResponsePreview(await response.text())
    throw new Error(`非 JSON 响应（HTTP ${response.status}，${contentType || "unknown"}）：${preview}`)
  }

  return (await response.json()) as T
}
