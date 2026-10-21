import { Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useInstall } from "../lib/pwa";

/**
 * Install 99ile. Chrome and Edge can show their own install prompt; Safari (iPhone, iPad, Mac) cannot, so the button
 * opens the steps in Settings. Shown in the phone header, the desktop sidebar and the wide home-page header, so a
 * wide iPad gets it too. `hideWhenInstalled` drops it where an unusable button would only take space.
 */
export default function InstallButton({ hideWhenInstalled, className }: { hideWhenInstalled?: boolean; className?: string }) {
  const navigate = useNavigate();
  const { installed, canPrompt, prompt } = useInstall();
  if (installed && hideWhenInstalled) return null;
  const label = installed ? "99ile is installed" : canPrompt ? "Install 99ile" : "Install 99ile: see how";
  const install = async () => {
    if (installed) return;
    if (canPrompt) await prompt();
    else navigate("/settings#install");
  };
  return (
    <button type="button" onClick={() => { void install(); }} disabled={installed} aria-label={label} title={label}
      className={cn("grid size-11 shrink-0 place-items-center rounded-md text-foreground/75 transition-colors hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none", installed && "cursor-default text-muted-foreground/45 hover:bg-transparent hover:text-muted-foreground/45", className)}>
      <Download className="size-5" aria-hidden />
    </button>
  );
}
