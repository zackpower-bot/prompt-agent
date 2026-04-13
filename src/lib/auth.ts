import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

export type AuthRole = "admin" | "member"
export interface AuthSession { role: AuthRole }

const AUTH_COOKIE = "pa_auth"
const AUTH_PREFIX = "prompt-agent-auth-v1"
const MAX_AGE = 30 * 24 * 60 * 60 // 30 days

function hmacSign(role: string, secret: string): string {
  return createHmac("sha256", secret).update(`${AUTH_PREFIX}:${role}`).digest("hex")
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export function resolveRole(password: string): AuthRole | null {
  const admin = process.env.ADMIN_PASSWORD
  const member = process.env.MEMBER_PASSWORD
  if (admin && safeEqual(password, admin)) return "admin"
  if (member && safeEqual(password, member)) return "member"
  return null
}

export function createToken(role: AuthRole): string {
  const secret = role === "admin" ? process.env.ADMIN_PASSWORD! : process.env.MEMBER_PASSWORD!
  return `${role}.${hmacSign(role, secret)}`
}

export function validateToken(token: string): AuthSession | null {
  const [role, sig] = token.split(".")
  if (!role || !sig || (role !== "admin" && role !== "member")) return null
  const secret = role === "admin" ? process.env.ADMIN_PASSWORD : process.env.MEMBER_PASSWORD
  if (!secret) return null
  const expected = hmacSign(role, secret)
  if (!safeEqual(sig, expected)) return null
  return { role: role as AuthRole }
}

export async function getSession(): Promise<AuthSession | null> {
  const jar = await cookies()
  const token = jar.get(AUTH_COOKIE)?.value
  if (!token) return null
  return validateToken(token)
}

export async function setSessionCookie(token: string) {
  const jar = await cookies()
  jar.set(AUTH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  })
}

export async function clearSessionCookie() {
  const jar = await cookies()
  jar.delete(AUTH_COOKIE)
}

export async function ensureAuthenticated(): Promise<boolean> {
  return (await getSession()) !== null
}

export async function ensureAdmin(): Promise<boolean> {
  const session = await getSession()
  return session?.role === "admin"
}
