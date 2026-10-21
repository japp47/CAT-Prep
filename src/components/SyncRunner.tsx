import { useEffect, useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useStore } from "@/lib/store";
import type { AppState } from "@/lib/state";
import type { SyncIO } from "@/lib/sync/client";
import { loadLedger, saveLedger } from "@/lib/sync/ledger";
import { poke, start } from "@/lib/sync/runner";

/**
 * Connects the sync runner to the store. Loaded only in builds with the API on, and only when the browser is idle.
 * Merges go through the store's queue (never over an edit still waiting), and a round reads the state only once
 * React has committed it, so the ledger and the state always describe the same rows.
 */
export default function SyncRunner() {
  const { state, transform } = useStore();
  const committed = useRef<AppState>(state);
  const waiting = useRef<(() => void)[]>([]);

  useEffect(() => {
    committed.current = state;
    const w = waiting.current;
    waiting.current = [];
    w.forEach((f) => f());
    poke();
  }, [state]);

  const io = useMemo<SyncIO>(() => ({
    call: api,
    getState: () => committed.current,
    apply: (fn) => new Promise<void>((done) => {
      waiting.current.push(done);
      transform(fn);
      setTimeout(done, 1000); // nothing changed, so no commit will come
    }),
    load: loadLedger,
    save: saveLedger,
    now: () => Date.now(),
  }), [transform]);

  useEffect(() => start(io), [io]);
  return null;
}
