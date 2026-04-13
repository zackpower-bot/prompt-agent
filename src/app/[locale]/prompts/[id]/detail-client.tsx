"use client"

import { useState, useCallback } from "react"
import { Link } from "@/i18n/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Copy, Check, Clock, Tag } from "lucide-react"
import type { PromptWithTags } from "@/app/actions/prompt.actions"

interface Props {
  prompt: PromptWithTags
}

export function PromptDetailClient({ prompt }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(prompt.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [prompt.content])

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/prompts"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{prompt.title}</h1>
        {prompt.description && (
          <p className="mt-2 text-muted-foreground">{prompt.description}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {prompt.status === "inbox" ? "收件箱" : prompt.status === "production" ? "生产" : prompt.status}
          </Badge>
          <Badge variant="outline">{prompt.category}</Badge>
          <Badge variant="outline">{prompt.model}</Badge>
          {prompt.tags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              <Tag className="mr-1 h-2.5 w-2.5" />
              {tag}
            </Badge>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            创建于 {formatDate(prompt.createdAt)}
          </span>
          <span>更新于 {formatDate(prompt.updatedAt)}</span>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Content */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-medium">提示词内容</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-xs">
            {copied ? <Check className="mr-1 h-3 w-3" /> : <Copy className="mr-1 h-3 w-3" />}
            {copied ? "已复制" : "复制"}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap rounded-md bg-muted/50 p-4 font-mono text-sm leading-relaxed">
            {prompt.content}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
