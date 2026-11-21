import { readBody, responses } from "../_shared/http.ts";
import { fetchUpstream, isNpmUsername, npmTokenFor } from "../_shared/npm.ts";

import { clampSize, searchAll, SearchError } from "./search.ts";

Deno.serve(async (req) => {
  const { json, preflight } = responses(req);
  const bad = (msg: string, status = 400) =>
    json({ ok: false, error: msg }, status);

  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body", 400);

  const username = String(body.username ?? "").trim();
  const size = clampSize(body.size);

  if (!username) return bad("Missing username", 400);
  if (!isNpmUsername(username)) return bad("Invalid username", 400);

  const npmToken = await npmTokenFor(req);

  // Maintainers only: npm's `author:` matches whoever published the latest
  // version, which trusted publishing records as GitHub Actions (#95). A
  // `mode` from pages loaded before that is ignored
  const query = `maintainer:${username}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (npmToken) headers.Authorization = `Bearer ${npmToken}`;

  // Up to 500, a page of 250 at a time; `total` says how many there are
  let data;

  try {
    data = await searchAll(query, size, { headers, fetch: fetchUpstream });
  } catch (e) {
    if (e instanceof SearchError) return bad(e.message, 502);

    throw e;
  }

  return json(
    {
      ok: true,
      data,
      authed: Boolean(npmToken), 
    },
    200
  );
});
