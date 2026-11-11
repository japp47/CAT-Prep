import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list relative inline-flex w-fit items-center justify-center rounded-xl p-1 text-muted-foreground group-data-[orientation=horizontal]/tabs:min-h-11 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-secondary",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

/**
 * The site's tabs (section pages, Progress, the practice library), one look everywhere and the same as the LR/DI
 * switch (kit SwitchTabs): a card-toned pill slides to the chosen tab on a soft track. The pill is measured from the
 * active trigger, and until it is (or without script) the active trigger carries the card tone itself, so nothing
 * flashes. The slide is a transform (the width follows at once), still under reduced motion.
 */
function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const ref = React.useRef<HTMLDivElement>(null)
  const pill = React.useRef<HTMLSpanElement>(null)
  const [ready, setReady] = React.useState(false)
  React.useLayoutEffect(() => {
    const list = ref.current, el = pill.current
    if (!list || !el || variant !== "default") return
    const place = () => {
      const on = list.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]')
      if (!on) return
      el.style.width = `${on.offsetWidth}px`
      el.style.transform = `translateX(${on.offsetLeft}px)`
      setReady(true)
    }
    place()
    const mo = new MutationObserver(place)
    mo.observe(list, { attributes: true, subtree: true, attributeFilter: ["data-state"] })
    const ro = new ResizeObserver(place)
    ro.observe(list)
    return () => { mo.disconnect(); ro.disconnect() }
  }, [variant])
  return (
    <TabsPrimitive.List
      ref={ref}
      data-slot="tabs-list"
      data-variant={variant}
      data-ready={ready || undefined}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {variant === "default" && (
        <span ref={pill} aria-hidden className={cn("pointer-events-none absolute top-1 bottom-1 left-0 rounded-lg bg-card shadow-xs transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none dark:shadow-none", !ready && "opacity-0")} />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-[1] inline-flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-lg border border-transparent px-4 py-1 text-base font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
        "data-[state=active]:font-semibold data-[state=active]:text-foreground group-data-[variant=default]/tabs-list:data-[state=active]:bg-card group-data-[ready]/tabs-list:data-[state=active]:bg-transparent",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
