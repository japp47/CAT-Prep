import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DeviceInfo } from "@/lib/sync/client";
import { devices, removeOne } from "@/lib/sync/runner";
import { Confirm } from "@/pages/practice/common";
import { ago } from "./ago";

/** The browsers that sync this progress. Removing one stops its syncing; it keeps its own copy. */
export default function DeviceList({ refresh }: { refresh: number }) {
  const [list, setList] = useState<DeviceInfo[] | null>(null);
  const [error, setError] = useState("");
  const [ask, setAsk] = useState<DeviceInfo | null>(null);
  const load = useCallback(async () => {
    const res = await devices();
    if (res.ok && "data" in res) { setList(res.data.devices); setError(""); } else if (!res.ok) setError(res.message);
  }, []);
  useEffect(() => { void load(); }, [load, refresh]);

  if (error) return <p className="text-base text-muted-foreground">{error}</p>;
  if (!list) return <p className="text-base text-muted-foreground">Loading your devices…</p>;
  return (
    <>
      <ul className="flex flex-col gap-2">
        {list.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-4 rounded-md bg-muted/60 px-4 py-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-medium">{d.label || "A browser"}{d.current && " (this device)"}</span>
              <span className="text-sm text-muted-foreground">{d.lastSyncedAt ? ago(Date.parse(d.lastSyncedAt)) : "Not synced yet"}</span>
            </span>
            {!d.current && <Button variant="ghost" size="sm" onClick={() => setAsk(d)}>Remove</Button>}
          </li>
        ))}
      </ul>
      <Confirm open={!!ask} onOpenChange={(o) => !o && setAsk(null)} title={`Remove ${ask?.label || "this browser"}?`} action="Remove" cancel="Cancel"
        onAction={async () => { if (ask) { const r = await removeOne(ask.id); if (!r.ok) setError(r.message); } setAsk(null); void load(); }}>
        It stops syncing and keeps the progress it has. To sync it again, link it with a new code.
      </Confirm>
    </>
  );
}
