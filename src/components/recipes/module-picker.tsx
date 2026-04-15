"use client"

import { useMemo, useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SLOT_GROUP, SLOT_LABELS, isValidSlot } from "@/lib/slots"
import { cn } from "@/lib/utils"

interface ModuleOption {
  id: string
  title: string
  type: string | null
  slot: string | null
}

interface ModulePickerProps {
  value: string | null
  options: ModuleOption[]
  onChange: (id: string | null) => void
  placeholder?: string
}

export function ModulePicker({
  value,
  options,
  onChange,
  placeholder = "选择模块...",
}: ModulePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = options.find((option) => option.id === value) ?? null

  const grouped = useMemo(() => {
    const result = {
      core: [] as ModuleOption[],
      advanced: [] as ModuleOption[],
      agent: [] as ModuleOption[],
      other: [] as ModuleOption[],
    }

    for (const option of options) {
      if (option.slot && isValidSlot(option.slot)) {
        result[SLOT_GROUP[option.slot]].push(option)
      } else {
        result.other.push(option)
      }
    }

    return result
  }, [options])

  const renderGroup = (heading: string, items: ModuleOption[]) =>
    items.length > 0 ? (
      <CommandGroup heading={heading}>
        {items.map((option) => (
          <CommandItem
            key={option.id}
            value={`${option.title} ${option.type ?? ""} ${option.slot ?? ""}`}
            onSelect={() => {
              onChange(option.id)
              setOpen(false)
            }}
          >
            <Check className={cn("h-4 w-4", option.id === value ? "opacity-100" : "opacity-0")} />
            <span className="flex-1 truncate">{option.title}</span>
            {option.slot && isValidSlot(option.slot) ? (
              <span className="ml-2 text-[10px] text-muted-foreground">
                {SLOT_LABELS[option.slot]}
              </span>
            ) : null}
          </CommandItem>
        ))}
      </CommandGroup>
    ) : null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <span className={cn("truncate", selected ? "text-foreground" : "text-muted-foreground/70")}>
            {selected ? selected.title : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="搜索模块..." />
          <CommandList>
            <CommandEmpty>没有找到匹配的模块</CommandEmpty>
            {renderGroup("核心 6", grouped.core)}
            {renderGroup("增强 3", grouped.advanced)}
            {renderGroup("Agent 2", grouped.agent)}
            {renderGroup("未分类", grouped.other)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
