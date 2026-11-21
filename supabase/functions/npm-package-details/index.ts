import { readBody, responses } from "../_shared/http.ts";
import { fetchUpstream, isPackageName, npmTokenFor } from "../_shared/npm.ts";

const NPM_REGISTRY = "https://registry.npmjs.org";

function parseRetryAfterSeconds(v: string | null): number | undefined {
  if (!v) return undefined;

  // "Retry-After: 120"
  const asNumber = Number(v);
  if (Number.isFinite(asNumber) && asNumber >= 0) return asNumber;

  // "Retry-After: Wed, 21 Oct 2015 07:28:00 GMT"
  const ms = Date.parse(v);
  if (!Number.isNaN(ms)) {
    const diff = Math.ceil((ms - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }

  return undefined;
}

Deno.serve(async (req) => {
  const { json, preflight } = responses(req);
  const bad = (msg: string, status = 400, extra?: Record<string, unknown>) =>
    json({ ok: false, error: msg, ...extra }, status);

  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body", 400);

  const name = String(body.name ?? "").trim();

  if (!name) return bad("Missing name", 400);
  if (!isPackageName(name)) return bad("Invalid package name", 400);

  const npmToken = await npmTokenFor(req);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (npmToken) headers.Authorization = `Bearer ${npmToken}`;

  const res = await fetchUpstream(
    `${NPM_REGISTRY}/${encodeURIComponent(name)}`,
    { headers },
  ).catch(() => null);

  // 200, here and below, to keep supabase.functions.invoke from surfacing
  // `error`. No npm body or URL: the site needs only the status.
  if (!res) {
    return bad("Could not reach npm", 200, {
      kind: "upstream_error",
      status: 502,
      authed: Boolean(npmToken),
    });
  }

  if (!res.ok) {
    await res.body?.cancel();

    const retryAfterSeconds = parseRetryAfterSeconds(res.headers.get("retry-after"));

    if (res.status === 429) {
      return bad("Rate limited by npm registry", 200, {
        kind: "rate_limited",
        status: 429,
        retryAfterSeconds,
        authed: Boolean(npmToken),
      });
    }

    return bad(`Upstream error: ${res.status}`, 200, {
      kind: "upstream_error",
      status: res.status,
      retryAfterSeconds,
      authed: Boolean(npmToken),
    });
  }

  const data = await res.json().catch(() => null);

  return json({ ok: true, data, authed: Boolean(npmToken) }, 200);
});
