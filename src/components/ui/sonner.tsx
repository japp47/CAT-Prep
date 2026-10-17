import { Toaster as Sonner, type ToasterProps } from "sonner"
import { usePref } from "@/lib/prefs"

/** Short notices such as "Added to your Error log". Follows the theme chosen in Settings. */
const Toaster = (props: ToasterProps) => {
  const [theme] = usePref<"auto" | "light" | "dark">("theme", "auto")
  return (
    <Sonner
      theme={theme === "auto" ? "system" : theme}
      position="bottom-center"
      className="toaster group"
      style={{ "--normal-bg": "var(--foreground)", "--normal-text": "var(--background)", "--normal-border": "transparent", "--border-radius": "10px" } as React.CSSProperties}
      {...props}
    />
  )
}

export { Toaster }
