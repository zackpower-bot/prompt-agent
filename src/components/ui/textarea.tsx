import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-20 w-full rounded-xl border border-input/80 bg-card px-4 py-3 text-[15px] leading-relaxed shadow-xs transition-all outline-none placeholder:text-muted-foreground/70 hover:border-input focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:shadow-sm disabled:cursor-not-allowed disabled:bg-muted/40 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
