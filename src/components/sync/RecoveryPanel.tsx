import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Shows a recovery code once (docs/architecture.md §5.1): it is the only way back if every device is lost, and
 * it cannot be reset, as Mullvad does it. Copy, download, then "I've saved it".
 */
export default function RecoveryPanel({ code, onDone }: { code: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(code); setCopied(true); } catch { setCopied(false); }
  };
  const download = () => {
    const text = `Your 99ile recovery code\n\n${code}\n\nIt brings your progress back on a new device: Settings, Sync between devices, "I use 99ile on another device", "Use a recovery code instead".\nKeep it private. Anyone with it can see and change your progress.\n`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    a.download = "99ile-recovery-code.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="flex flex-col gap-4 rounded-lg bg-warning-soft p-5">
      <h3 className="text-heading font-semibold">Save your recovery code</h3>
      <p className="text-base">If you lose every device, this code brings your progress back. We cannot reset it or send it again.</p>
      <p className="select-all text-2xl font-semibold tracking-wider tabular-nums break-all" aria-label={"Recovery code " + code.split("").join(" ")}>{code}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={copy}>{copied ? "Copied" : "Copy"}</Button>
        <Button variant="outline" onClick={download}>Download</Button>
        <Button variant="secondary" onClick={onDone}>I've saved it</Button>
      </div>
    </div>
  );
}
