import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/** Small status words in sentence case. Highlight is for the core task and the RC of the day only. */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-1.5 py-px text-sm font-medium whitespace-nowrap [&>svg]:size-3.5",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground",
        secondary: "bg-secondary text-muted-foreground",
        highlight: "bg-highlight text-highlight-foreground",
        success: "bg-success-soft text-success",
        danger: "bg-danger-soft text-danger",
        warning: "bg-warning-soft text-warning",
      },
    },
    defaultVariants: { variant: "default" },
  }
)

function Badge({ className, variant = "default", asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
