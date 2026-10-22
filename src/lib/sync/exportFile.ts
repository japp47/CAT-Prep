import { normalize, type AppState } from "../state";
import { fromRecords, KINDS, type Kind } from "./records";

/** What GET /v1/me/export returns (server/internal/syncapi). */
export interface ServerExport {
  exportedAt: string;
  identity: { id: string; createdAt: string };
  devices: { label: string; platform: string; createdAt: string; lastSyncedAt: string | null }[];
  records: { kind: string; id: string; data: unknown }[];
}

/**
 * Turns the server's copy into a backup file: the same shape as "Download backup", so Restore reads it, plus
 * `server` with what the server keeps about this progress besides the records (the DPDP right to access).
 */
export function exportToBackup(x: ServerExport): AppState & { server: Omit<ServerExport, "records"> } {
  const recs = x.records.filter((r) => (KINDS as readonly string[]).includes(r.kind)).map((r) => ({ kind: r.kind as Kind, id: r.id, data: r.data }));
  const st = normalize(JSON.parse(JSON.stringify(fromRecords(recs))));
  return { ...st, server: { exportedAt: x.exportedAt, identity: x.identity, devices: x.devices } };
}

export function downloadJSON(name: string, value: unknown) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
