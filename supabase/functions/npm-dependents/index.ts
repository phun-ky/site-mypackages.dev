import { readBody, responses } from "../_shared/http.ts";
import { isPackageName, npmTokenFor } from "../_shared/npm.ts";

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

  if (!name) return bad("Missing name", 400);
  if (!isPackageName(name)) return bad("Invalid package name", 400);

  try {
    const npmToken = await npmTokenFor(req);

    return json({
      ok: true,
      dependents: await npmDependents(name, undefined, npmToken),
    });
  } catch (e) {
    return failed("npm-dependents", e, 502);
  }
});
