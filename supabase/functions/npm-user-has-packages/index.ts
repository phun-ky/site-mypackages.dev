import { readBody, responses } from "../_shared/http.ts";
import { fetchUpstream, isNpmUsername, npmTokenFor } from "../_shared/npm.ts";

const NPM_REGISTRY = "https://registry.npmjs.org";

Deno.serve(async (req) => {
  const { json, preflight } = responses(req);
  const bad = (msg: string, status = 400) =>
    json({ ok: false, error: msg }, status);

  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body", 400);

  const username = String(body.username ?? "").trim();

  if (!username) return bad("Missing username", 400);
  if (!isNpmUsername(username)) return bad("Invalid username", 400);

  const npmToken = await npmTokenFor(req);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (npmToken) headers.Authorization = `Bearer ${npmToken}`;

  // Maintainers only (#95); a `mode` from pages loaded before that is ignored
  const res = await fetchUpstream(
    `${NPM_REGISTRY}/-/v1/search?text=` +
      encodeURIComponent(`maintainer:${username}`) +
      `&size=1`,
    { headers },
  ).catch(() => null);

  if (!res) return bad("Could not reach npm", 502);

  if (!res.ok) {
    await res.body?.cancel();

    // No upstream text, only the status
    return json({ ok: true, hasPackages: false, status: res.status }, 200);
  }

  const data = (await res.json().catch(() => ({}))) as { total?: number };

  return json(
    {
      ok: true,
      hasPackages: (data.total ?? 0) > 0,
      total: data.total ?? 0,
      status: res.status,
      authed: Boolean(npmToken),
    },
    200,
  );
});
