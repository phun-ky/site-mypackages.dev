import { downloadRange, rangePath } from "../_shared/download-range.ts";
import { readBody, responses } from "../_shared/http.ts";
import { fetchUpstream, isPackageName, npmTokenFor } from "../_shared/npm.ts";

const NPM_REGISTRY_API = "https://api.npmjs.org";

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

  // 12 complete months and this month so far, not npm's `last-year` (#93)
  const res = await fetchUpstream(
    `${NPM_REGISTRY_API}/downloads/range/${rangePath(downloadRange(new Date()))}/` +
      encodeURIComponent(name),
    { headers },
  ).catch(() => null);

  if (!res) return bad("Could not reach npm", 502, { status: 502 });

  if (!res.ok) {
    await res.body?.cancel();

    const retryAfterSeconds = Number(res.headers.get("retry-after") ?? NaN);

    // No npm body or URL: the site needs only the status
    return bad(`Upstream error: ${res.status}`, 502, {
      status: res.status,
      retryAfterSeconds: Number.isFinite(retryAfterSeconds)
        ? retryAfterSeconds
        : undefined,
    });
  }

  const data = await res.json().catch(() => null);

  return json({ ok: true, data, authed: Boolean(npmToken) }, 200);
});
