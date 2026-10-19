import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { usePref } from "../lib/prefs";

export type Theme = "auto" | "light" | "dark";

function useSystemDark() {
  const query = "(prefers-color-scheme: dark)";
  const [dark, setDark] = useState(() => typeof matchMedia === "function" && matchMedia(query).matches);
  useEffect(() => {
    const media = matchMedia(query), update = () => setDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return dark;
}

export default function ThemeToggle() {
  const [theme, setTheme] = usePref<Theme>("theme", "auto");
  const systemDark = useSystemDark();
  const dark = theme === "dark" || (theme === "auto" && systemDark);
  const label = dark ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={label} title={label}
      className="grid size-11 place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}
