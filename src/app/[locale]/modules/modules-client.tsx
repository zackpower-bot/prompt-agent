"use client"

import { useCallback, useEffect, useMemo, useState, useTransition } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, Pencil, Trash2, Save, X, Check } from "lucide-react"
import {
  createModule,
  deleteModule,
  getModulesPaginated,
  normalizeModuleSlot,
  updateModule,
} from "@/app/actions/module.actions"
import type { ModuleWithMeta } from "@/app/actions/module.actions"
import {
  AGENT_SLOTS,
  ADVANCED_SLOTS,
  CORE_SLOTS,
  SLOT_LABELS,
  type Slot,
} from "@/lib/slots"

const MODULE_TYPES = [
  { value: "role", label: "角色" },
  { value: "goal", label: "目标" },
  { value: "constraint", label: "约束" },
  { value: "output_format", label: "输出格式" },
  { value: "style", label: "风格" },
  { value: "self_check", label: "自检" },
]

const SLOT_GROUPS: Array<{ label: string; slots: readonly Slot[] }> = [
  { label: "核心 6", slots: CORE_SLOTS },
  { label: "增强 3", slots: ADVANCED_SLOTS },
  { label: "Agent 2", slots: AGENT_SLOTS },
]

interface ModulesClientProps {
  initialModules: ModuleWithMeta[]
  initialTotal: number
  pageSize: number
}

export function ModulesClient({
  initialModules,
  initialTotal,
  pageSize,
}: ModulesClientProps) {
  const [modules, setModules] = useState(initialModules)
  const [total, setTotal] = useState(initialTotal)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [hasMore, setHasMore] = useState(initialModules.length === pageSize)
  const [allLoaded, setAllLoaded] = useState(false)

  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newType, setNewType] = useState("role")
  const [newSlot, setNewSlot] = useState<string>("")

  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editType, setEditType] = useState("")
  const [editSlot, setEditSlot] = useState<string>("")

  const loadPage = useCallback(
    (offset = 0, mode: "replace" | "append" = "replace") => {
      startTransition(async () => {
        const result = await getModulesPaginated({
          type: typeFilter !== "all" ? typeFilter : undefined,
          search: search || undefined,
          limit: pageSize,
          offset,
        })
        if (!result.success) return

        setModules((prev) => (mode === "append" ? [...prev, ...result.data] : result.data))
        setTotal(result.total)
        setHasMore(result.data.length === pageSize)
        setAllLoaded(offset > 0 && result.data.length < pageSize)
        if (mode === "replace") setAllLoaded(false)
      })
    },
    [pageSize, search, typeFilter]
  )

  useEffect(() => {
    loadPage(0, "replace")
  }, [loadPage])

  const handleLoadMore = useCallback(() => {
    loadPage(modules.length, "append")
  }, [loadPage, modules.length])

  const resetCreateForm = () => {
    setCreating(false)
    setNewTitle("")
    setNewContent("")
    setNewType("role")
    setNewSlot("")
  }

  const handleCreate = useCallback(() => {
    if (!newTitle.trim() || !newContent.trim()) return
    startTransition(async () => {
      const result = await createModule({
        title: newTitle,
        content: newContent,
        type: newType,
        slot: normalizeModuleSlot(newSlot),
      })
      if (result.success) {
        resetCreateForm()
        loadPage(0, "replace")
      }
    })
  }, [loadPage, newContent, newSlot, newTitle, newType])

  const startEdit = (module: ModuleWithMeta) => {
    setEditingId(module.id)
    setEditTitle(module.title)
    setEditContent(module.content)
    setEditType(module.type)
    setEditSlot(module.slot ?? "")
  }

  const handleUpdate = useCallback(() => {
    if (!editingId) return
    startTransition(async () => {
      const result = await updateModule(editingId, {
        title: editTitle,
        content: editContent,
        type: editType,
        slot: normalizeModuleSlot(editSlot),
      })
      if (result.success) {
        setEditingId(null)
        loadPage(0, "replace")
      }
    })
  }, [editContent, editSlot, editTitle, editType, editingId, loadPage])

  const handleDelete = useCallback(
    (id: string) => {
      startTransition(async () => {
        const result = await deleteModule(id)
        if (result.success) {
          loadPage(0, "replace")
        }
      })
    },
    [loadPage]
  )

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })

  const empty = useMemo(() => modules.length === 0 && !isPending, [isPending, modules.length])

  const SlotSelect = ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-md border px-3 py-2 text-sm"
    >
      <option value="">选择插槽（可选）</option>
      {SLOT_GROUPS.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.slots.map((slot) => (
            <option key={slot} value={slot}>
              {SLOT_LABELS[slot]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  )

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
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
            </div>
            <Button size="sm" onClick={() => setCreating(true)} disabled={creating}>
              <Plus className="mr-1 h-4 w-4" />
              新建模块
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-2 text-sm text-muted-foreground">{total} 个模块</p>
            <Button
              variant={typeFilter === "all" ? "default" : "secondary"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              全部
            </Button>
            {MODULE_TYPES.map((type) => (
              <Button
                key={type.value}
                variant={typeFilter === type.value ? "default" : "secondary"}
                size="sm"
                onClick={() => setTypeFilter(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {creating && (
        <Card className="mb-4">
          <CardContent className="flex flex-col gap-3 pt-4">
            <Input
              placeholder="模块标题"
              value={newTitle}
              onChange={(event) => setNewTitle(event.target.value)}
            />
            <select
              value={newType}
              onChange={(event) => setNewType(event.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              {MODULE_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <SlotSelect value={newSlot} onChange={setNewSlot} />
            <Textarea
              placeholder="模块内容..."
              value={newContent}
              onChange={(event) => setNewContent(event.target.value)}
              className="min-h-[120px] font-mono text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate} disabled={isPending}>
                <Save className="mr-1 h-3 w-3" />
                保存
              </Button>
              <Button size="sm" variant="ghost" onClick={resetCreateForm}>
                <X className="mr-1 h-3 w-3" />
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <ul className="space-y-1">
        {modules.map((module) => (
          <li key={module.id} className="list-row">
            <div className="min-w-0 flex-1">
              {editingId === module.id ? (
                <div className="space-y-3">
                  <Input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
                  <select
                    value={editType}
                    onChange={(event) => setEditType(event.target.value)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                  >
                    {MODULE_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <SlotSelect value={editSlot} onChange={setEditSlot} />
                  <Textarea
                    value={editContent}
                    onChange={(event) => setEditContent(event.target.value)}
                    className="min-h-[100px] font-mono text-sm"
                  />
                </div>
              ) : (
                <>
                  <h3 className="font-serif text-base">{module.title}</h3>
                  <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {module.content}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="mono-label">
                      {MODULE_TYPES.find((type) => type.value === module.type)?.label ?? module.type}
                    </Badge>
                    {module.slot && (
                      <Badge variant="warm" className="text-[10px]">
                        {SLOT_LABELS[module.slot as Slot]}
                      </Badge>
                    )}
                    {module.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="flex shrink-0 items-start gap-3">
              <div className="flex flex-col items-end gap-2">
                {editingId === module.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleUpdate}
                      disabled={isPending}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <time className="text-xs text-muted-foreground">{formatDate(module.updatedAt)}</time>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => startEdit(module)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive"
                        onClick={() => handleDelete(module.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {modules.length > 0 && hasMore && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={isPending}>
            {isPending ? "加载中..." : "加载更多"}
          </Button>
        </div>
      )}

      {modules.length > 0 && allLoaded && (
        <p className="mt-4 text-center text-sm text-muted-foreground">已显示全部</p>
      )}

      {empty && (
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
