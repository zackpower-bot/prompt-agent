import createMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"
import { NextRequest, NextResponse } from "next/server"

const intlMiddleware = createMiddleware(routing)

const PUBLIC_PATHS = ["/login", "/api/health"]
const EN_LOCALE_PREFIX = "/en"

function redirectEnglishLocale(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (pathname === EN_LOCALE_PREFIX || pathname.startsWith(`${EN_LOCALE_PREFIX}/`)) {
    const suffix = pathname.slice(EN_LOCALE_PREFIX.length) || ""
    const url = new URL(request.url)
    url.pathname = `/zh${suffix}`
    return NextResponse.redirect(url)
  }
}

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.endsWith(p))
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const zhRedirect = redirectEnglishLocale(request)
  if (zhRedirect) {
    return zhRedirect
  }

  // Skip auth for API routes (except those needing protection)
  if (pathname.startsWith("/api/")) {
    if (isPublic(pathname)) return NextResponse.next()
    const token = request.cookies.get("pa_auth")?.value
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.next()
  }

  // Check auth for non-public pages
  if (!isPublic(pathname)) {
    const token = request.cookies.get("pa_auth")?.value
    if (!token) {
      const loginUrl = new URL("/zh/login", request.url)
      return NextResponse.redirect(loginUrl)
    }
  }

  return intlMiddleware(request)
}

export const config = {
  matcher: ["/((?!_next|_vercel|.*\\..*).*)"],
}
