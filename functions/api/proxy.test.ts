import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "./[[path]]";

const env = { API_ORIGIN: "https://api.example", PROXY_SECRET: "s".repeat(32) };

afterEach(() => vi.unstubAllGlobals());

function capture(res: Response = new Response("{}", { status: 200, headers: { "Set-Cookie": "__Host-dev=x; Path=/; Secure; HttpOnly" } })) {
  const seen: { url: string; init: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: URL, init: RequestInit) => { seen.push({ url: String(url), init }); return res; });
  return seen;
}

describe("api proxy", () => {
  it("forwards /api/v1 with the secret and the student's address, and returns the cookie", async () => {
    const seen = capture();
    const req = new Request("https://99ile.pages.dev/api/v1/sync/pull?x=1", {
      method: "POST", body: '{"cursor":0}',
      headers: { "CF-Connecting-IP": "203.0.113.7", "X-Proxy-Secret": "forged", "X-Client-Ip": "1.1.1.1", Cookie: "__Host-dev=abc", Origin: "https://99ile.pages.dev" },
    });
    const res = await onRequest({ request: req, env });
    expect(seen[0].url).toBe("https://api.example/v1/sync/pull?x=1");
    const h = new Headers(seen[0].init.headers);
    expect(h.get("X-Proxy-Secret")).toBe(env.PROXY_SECRET);
    expect(h.get("X-Client-Ip")).toBe("203.0.113.7");
    expect(h.get("Cookie")).toBe("__Host-dev=abc");
    expect(h.get("Origin")).toBe("https://99ile.pages.dev");
    expect(new TextDecoder().decode(seen[0].init.body as ArrayBuffer)).toBe('{"cursor":0}');
    expect(res.headers.get("Set-Cookie")).toContain("__Host-dev=x");
  });

  it("never forwards a client's own secret or address header", async () => {
    const seen = capture();
    await onRequest({ request: new Request("https://99ile.pages.dev/api/v1/identity", { headers: { "X-Proxy-Secret": "forged", "X-Client-Ip": "1.1.1.1" } }), env: { API_ORIGIN: env.API_ORIGIN } });
    const h = new Headers(seen[0].init.headers);
    expect(h.get("X-Proxy-Secret")).toBeNull();
    expect(h.get("X-Client-Ip")).toBeNull();
  });

  it("only forwards /api/v1, and answers JSON when the server is unset or down", async () => {
    capture();
    expect((await onRequest({ request: new Request("https://99ile.pages.dev/api/healthz"), env })).status).toBe(404);
    expect((await onRequest({ request: new Request("https://99ile.pages.dev/api/v1/identity"), env: {} })).status).toBe(503);
    vi.stubGlobal("fetch", async () => { throw new Error("down"); });
    const res = await onRequest({ request: new Request("https://99ile.pages.dev/api/v1/identity"), env });
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("unavailable");
  });
});
