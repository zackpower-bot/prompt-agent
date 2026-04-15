"use client"

import { useState, useCallback, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Pencil, Trash2, Save, X, Check } from "lucide-react"
import { getModules, createModule, updateModule, deleteModule } from "@/app/actions/module.actions"
import type { ModuleWithMeta } from "@/app/actions/module.actions"

const MODULE_TYPES = [
  { value: "role", label: "角色" },
  { value: "goal", label: "目标" },
  { value: "constraint", label: "约束" },
  { value: "output_format", label: "输出格式" },
  { value: "style", label: "风格" },
  { value: "self_check", label: "自检" },
]

export function ModulesClient({ initialModules }: { initialModules: ModuleWithMeta[] }) {
  const [modules, setModules] = useState(initialModules)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newType, setNewType] = useState("role")

  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editType, setEditType] = useState("")

  const refresh = useCallback(() => {
    startTransition(async () => {
      const result = await getModules({ type: typeFilter !== "all" ? typeFilter : undefined, search: search || undefined })
      if (result.success) setModules(result.data)
    })
  }, [typeFilter, search])

  const handleCreate = useCallback(() => {
    if (!newTitle.trim() || !newContent.trim()) return
    startTransition(async () => {
      const result = await createModule({ title: newTitle, content: newContent, type: newType })
      if (result.success) {
        setCreating(false)
        setNewTitle("")
        setNewContent("")
        setNewType("role")
        refresh()
      }
    })
  }, [newTitle, newContent, newType, refresh])

  const startEdit = (m: ModuleWithMeta) => {
    setEditingId(m.id)
    setEditTitle(m.title)
    setEditContent(m.content)
    setEditType(m.type)
  }

  const handleUpdate = useCallback(() => {
    if (!editingId) return
    startTransition(async () => {
      const result = await updateModule(editingId, { title: editTitle, content: editContent, type: editType })
      if (result.success) {
        setEditingId(null)
        refresh()
      }
    })
  }, [editingId, editTitle, editContent, editType, refresh])

  const handleDelete = useCallback((id: string) => {
    startTransition(async () => {
      const result = await deleteModule(id)
      if (result.success) refresh()
    })
  }, [refresh])

  const filtered = modules.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.title.toLowerCase().includes(q) || m.content.toLowerCase().includes(q)
    }
    return true
  })

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })

  return (
    <div className="container-reading">
      <div className="sticky top-0 z-10 mb-6 bg-background/80 py-3 backdrop-blur">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索模块..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
              <Plus className="mr-1 h-4 w-4" />
              新建模块
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-muted-foreground">{modules.length} 个模块</p>
            <Button variant={typeFilter === "all" ? "default" : "secondary"} size="sm" onClick={() => setTypeFilter("all")}>全部</Button>
            {MODULE_TYPES.map((t) => (
              <Button key={t.value} variant={typeFilter === t.value ? "default" : "secondary"} size="sm" onClick={() => setTypeFilter(t.value)}>{t.label}</Button>
            ))}
          </div>
        </div>
      </div>

      {creating && (
        <Card className="mb-4">
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="模块标题" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <select value={newType} onChange={(e) => setNewType(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm">
              {MODULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <Textarea placeholder="模块内容..." value={newContent} onChange={(e) => setNewContent(e.target.value)} className="min-h-[120px] font-mono text-sm" />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isPending}><Save className="mr-1 h-3 w-3" />保存</Button>
              <Button size="sm" variant="ghost" onClick={() => setCreating(false)}><X className="mr-1 h-3 w-3" />取消</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-1">
        {filtered.map((m) => (
          <li key={m.id} className="list-row">
            <div className="min-w-0 flex-1">
              {editingId === m.id ? (
                <div className="space-y-3">
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  <select value={editType} onChange={(e) => setEditType(e.target.value)} className="rounded-md border px-3 py-1.5 text-sm">
                    {MODULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <Textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} className="min-h-[100px] font-mono text-sm" />
                </div>
              ) : (
                <>
                  <h3 className="font-serif text-base">{m.title}</h3>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{m.content}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="mono-label">{MODULE_TYPES.find((t) => t.value === m.type)?.label ?? m.type}</Badge>
                    {m.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-3">
              <div className="flex flex-col items-end gap-2">
                {editingId === m.id ? (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={handleUpdate} disabled={isPending}><Check className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <>
                    <time className="text-xs text-muted-foreground">{formatDate(m.updatedAt)}</time>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(m)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(m.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
      {filtered.length === 0 && !isPending && (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <h2 className="text-xl">还没有整理好的模块</h2>
          <p className="mx-auto mt-3 max-w-[38rem] text-sm leading-7 text-muted-foreground">
            当你开始把常用角色、约束和输出格式拆出来，这里会慢慢形成自己的模块库。
            <br />
            先新建一个模块，把最常复用的一段提示词沉淀下来，之后组装会轻松很多。
          </p>
          <div className="mt-5">
            <Button onClick={() => setCreating(true)}>
              <Plus className="mr-1 h-4 w-4" />
              新建模块
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
