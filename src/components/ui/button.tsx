import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

/** One filled action per screen (default). The rest are secondary (a tint of the brand blue), ghost or link. */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-[background-color,color,transform] duration-150 outline-none select-none active:translate-y-px focus-visible:ring-[3px] focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        // In dark the accent fill (#222b45) stands only 1.23:1 off a card (#161b24), so the button read as part of
        // the surface or as switched off. Light has the separation already; dark gets a hairline of the brand ink.
        secondary: "bg-accent text-accent-foreground hover:bg-primary/15 dark:ring-1 dark:ring-inset dark:ring-primary/30",
        outline: "bg-card text-foreground ring-1 ring-inset ring-input hover:bg-muted",
        ghost: "text-foreground hover:bg-secondary",
        destructive: "bg-danger-soft text-danger hover:bg-danger-soft/70",
        link: "h-auto px-0 text-primary underline underline-offset-4 decoration-primary/40 hover:decoration-primary",
      },
      size: {
        default: "h-11 px-5 text-base",
        sm: "h-9 px-3.5 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
