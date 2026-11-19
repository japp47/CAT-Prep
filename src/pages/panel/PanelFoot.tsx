import type { ReactNode } from "react";

/**
 * A panel page's action, kept at the bottom of the panel: below the content when it is short, and in view while a
 * long page scrolls under it (a soft fade above it, not a line).
 */
export function PanelFoot({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mb-6 mt-auto flex flex-col gap-3 bg-background pt-6 pb-6 before:pointer-events-none before:absolute before:inset-x-0 before:-top-6 before:h-6 before:bg-linear-to-t before:from-background before:to-transparent">
      {children}
    </div>
  );
}
