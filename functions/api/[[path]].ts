/**
 * Cloudflare Pages Function: forwards /api/v1/* to the Go server (docs/plan.md "proxy"). Because the browser only
 * ever talks to the site's own origin, the device cookie stays first-party and no CORS is needed.
 *
 * Pages environment variables: API_ORIGIN (https://nine9ile-api.onrender.com) and PROXY_SECRET (the same value as on
 * Render). The secret proves to the server that a request came through here, so it can trust X-Client-Ip.
 */

interface Env { API_ORIGIN?: string; PROXY_SECRET?: string }

// Headers that belong to one connection and must not be forwarded, plus ours, which only this proxy may set.
const DROP = ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "host", "x-proxy-secret", "x-client-ip"];

const fail = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ error: { code, message } }), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function onRequest({ request, env }: { request: Request; env: Env }): Promise<Response> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/v1/")) return fail(404, "not_found", "There is nothing at this address.");
  if (!env.API_ORIGIN) return fail(503, "sync_unavailable", "Sync is not available yet. Your progress is safe on this device.");

  const headers = new Headers(request.headers);
  DROP.forEach((h) => headers.delete(h));
  if (env.PROXY_SECRET) headers.set("X-Proxy-Secret", env.PROXY_SECRET);
  const ip = request.headers.get("CF-Connecting-IP");
  if (ip) headers.set("X-Client-Ip", ip);
  const rid = request.headers.get("CF-Ray");
  if (rid && !headers.has("X-Request-Id")) headers.set("X-Request-Id", rid.replace(/[^A-Za-z0-9._-]/g, "").slice(0, 64));

  try {
    const res = await fetch(new URL(url.pathname.slice(4) + url.search, env.API_ORIGIN), {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    const out = new Headers(res.headers);
    DROP.forEach((h) => out.delete(h));
    return new Response(res.body, { status: res.status, headers: out });
  } catch {
    return fail(503, "unavailable", "The sync server is not answering. Your progress is safe on this device.");
  }
}
