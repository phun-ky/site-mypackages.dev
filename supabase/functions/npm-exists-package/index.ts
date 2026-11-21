import { readBody, responses } from "../_shared/http.ts";
import { fetchUpstream, isPackageName, npmTokenFor } from "../_shared/npm.ts";

const NPM_REGISTRY = "https://registry.npmjs.org";

Deno.serve(async (req) => {
  const { json, preflight } = responses(req);
  const bad = (msg: string, status = 400) =>
    json({ ok: false, error: msg }, status);

  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body", 400);

  const packageName = String(body.packageName ?? "").trim();

  if (!packageName) return bad("Missing packageName", 400);
  if (!isPackageName(packageName)) return bad("Invalid package name", 400);

  const npmToken = await npmTokenFor(req);
  const headers: Record<string, string> = {
    Accept: "application/vnd.npm.install-v1+json",
  };
  if (npmToken) headers.Authorization = `Bearer ${npmToken}`;

  const res = await fetchUpstream(
    `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`,
    { headers },
  ).catch(() => null);

  if (!res) return bad("Could not reach npm", 502);

  // Only whether it exists, so the body isn't read
  await res.body?.cancel();

  return json(
    {
      ok: true,
      exists: res.ok,
      status: res.status,
      authed: Boolean(npmToken),
    },
    200,
  );
});
