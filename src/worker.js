/* ============================================================
   spark.eggers.dev — Cloudflare Worker
   Serves the static deck (via the ASSETS binding) and a tiny
   progress-sync API backed by KV (binding: SPARK_STATE).

   API:
     GET  /api/state/:code   -> stored JSON state for that sync code (or {})
     PUT  /api/state/:code   -> overwrite stored JSON state (last-write-wins)

   Sync codes are user-chosen slugs (e.g. "spark-7f3a9c"). The site is
   public; each code's data is isolated, so a stranger gets a blank deck.
   ============================================================ */

const MAX_BYTES = 256 * 1024; // generous cap for one person's progress
const CODE_RE = /^[a-z0-9][a-z0-9-]{2,40}$/;
const PREFIX = "/api/state/";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(PREFIX)) {
      return handleState(request, env, url);
    }

    // Everything else is a static asset (index.html, app.js, etc.)
    return env.ASSETS.fetch(request);
  },
};

async function handleState(request, env, url) {
  const code = decodeURIComponent(url.pathname.slice(PREFIX.length)).trim().toLowerCase();
  if (!CODE_RE.test(code)) {
    return json({ error: "invalid sync code" }, 400);
  }
  const key = "state:" + code;

  if (request.method === "GET") {
    const val = await env.SPARK_STATE.get(key);
    return new Response(val || "{}", {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
    });
  }

  if (request.method === "PUT") {
    const body = await request.text();
    if (body.length > MAX_BYTES) return json({ error: "state too large" }, 413);
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch {
      return json({ error: "invalid json" }, 400);
    }
    if (typeof parsed !== "object" || parsed === null) return json({ error: "expected object" }, 400);
    await env.SPARK_STATE.put(key, JSON.stringify(parsed));
    return json({ ok: true });
  }

  return json({ error: "method not allowed" }, 405);
}
