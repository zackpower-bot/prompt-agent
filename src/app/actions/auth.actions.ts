"use server"

import { resolveRole, createToken, setSessionCookie, clearSessionCookie } from "@/lib/auth"
import { redirect } from "next/navigation"

export async function loginAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const password = formData.get("password") as string
  if (!password) return { error: "请输入密码" }

  const role = resolveRole(password)
  if (!role) return { error: "密码错误" }

  const token = createToken(role)
  await setSessionCookie(token)
  redirect("/")
}

export async function logoutAction() {
  await clearSessionCookie()
  redirect("/login")
}
