"use client"

import { useActionState } from "react"
import { loginAction } from "@/app/actions/auth.actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Bot, Eye, EyeOff } from "lucide-react"
import { useState } from "react"

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-[380px] rounded-[20px] border border-border bg-card px-8 py-8 shadow-[0_20px_48px_-20px_rgba(71,55,38,0.15)]">
        <div className="mb-5 flex items-center justify-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-agent/15">
            <Bot className="h-4 w-4 text-agent" />
          </div>
          <span className="font-serif text-base tracking-[-0.01em] text-foreground">Prompt Agent</span>
        </div>

        <header className="mb-6 text-center">
          <h1 className="font-serif text-[28px] font-medium tracking-[-0.02em] text-foreground">欢迎回来</h1>
          <p className="mt-1 text-sm text-muted-foreground">登录后继续管理你的提示词资产。</p>
        </header>

        <form action={formAction} className="space-y-4">
          <input type="text" name="username" autoComplete="username" className="sr-only" defaultValue="user" tabIndex={-1} />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">密码</label>
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="输入密码..."
                autoComplete="current-password"
                autoFocus
                required
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

          <Button type="submit" className="mt-2 w-full" disabled={isPending}>
            {isPending ? "登录中..." : "登录"}
          </Button>
        </form>
      </div>
    </div>
  )
}
