import type { ReactNode } from "react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

/**
 * The phone menu. Its own chunk: the dialog code behind it (focus trap, scroll lock) is about 10 KB that no page needs
 * until the menu opens. Layout fetches it when the browser is idle and as soon as a finger touches a menu button.
 */
export default function MenuSheet({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: ReactNode; children: ReactNode }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" aria-describedby={undefined} className="w-[min(86vw,340px)] gap-6 overflow-y-auto overscroll-contain bg-sidebar pt-6 pb-8 pl-4 pr-[max(1rem,env(safe-area-inset-right))]">
        <SheetTitle className="px-1">{title}</SheetTitle>
        {children}
      </SheetContent>
    </Sheet>
  );
}
