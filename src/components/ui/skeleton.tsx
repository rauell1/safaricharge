import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-[var(--bg-card-muted)] animate-pulse rounded-md", className)}
      {...props}
    />
  )
}

export { Skeleton }
