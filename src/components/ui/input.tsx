import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-10 w-full min-w-0 rounded-lg border bg-transparent px-3.5 py-2.5 text-sm shadow-sm transition-all duration-200 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "hover:border-[var(--border-strong)] hover:bg-[var(--bg-card-muted)]",
        "focus-visible:border-ring focus-visible:ring-ring/60 focus-visible:ring-[3px] focus-visible:bg-[var(--bg-card-muted)]",
        "aria-invalid:ring-destructive/25 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
