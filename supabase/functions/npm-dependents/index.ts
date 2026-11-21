import { readBody, responses } from "../_shared/http.ts";

import { npmDependents } from "./dependents.ts";

// npm's count of the packages that depend on a package, for the package
// page's "Used by" section
Deno.serve(async (req) => {
  const { json, preflight, failed } = responses(req);
  const bad = (msg: string, status = 400) =>
    json({ ok: false, error: msg }, status);

  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body", 400);

  const name = String(body.name ?? "").trim();

  // npm's longest name
  if (!name || name.length > 214) return bad("Missing or invalid name", 400);

  try {
    return json({ ok: true, dependents: await npmDependents(name) });
  } catch (e) {
    return failed("npm-dependents", e, 502);
  }
});
