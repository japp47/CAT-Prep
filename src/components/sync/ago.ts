/** "Synced 3 minutes ago", from a time in ms. */
export function ago(t: number | undefined, now = Date.now()) {
  if (!t) return "Not synced yet";
  const m = Math.floor((now - t) / 60_000);
  if (m < 1) return "Synced just now";
  if (m < 60) return `Synced ${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `Synced ${h} hour${h === 1 ? "" : "s"} ago` : `Synced on ${new Date(t).toLocaleDateString()}`;
}
