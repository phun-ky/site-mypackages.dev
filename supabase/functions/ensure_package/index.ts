import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { readBody, responses } from "../_shared/http.ts";
import { fetchUpstream, isPackageName } from "../_shared/npm.ts";

const normalizePackageName = (raw: string) =>
  raw.trim().replace(/\s+/g, "").toLowerCase();

const NPM_REGISTRY = "https://registry.npmjs.org";

Deno.serve(async (req) => {
  const { json, preflight, failed } = responses(req);
  const bad = (message: string, status = 400) =>
    json({ ok: false, error: message }, status);

  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") return bad("Method not allowed", 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return bad("Missing Authorization header", 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  // IMPORTANT: use anon + pass user JWT so RLS applies
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Identify user (we need user_id for RLS), before asking npm for anyone
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData?.user) return bad("Unauthorized", 401);

  const user_id = userData.user.id;

  const body = await readBody(req);
  if (!body) return bad("Invalid JSON body", 400);

  const { packageName: rawPackageName, registry = "npm" } = body;

  if (registry !== "npm") {
    // ready for github later
    return bad("Only registry='npm' is supported right now", 400);
  }

  const packageName = normalizePackageName(String(rawPackageName ?? ""));
  if (!packageName) return bad("Package name is required", 400);

  if (packageName.length < 2) return bad("Package name looks too short", 400);
  if (!isPackageName(packageName)) return bad("Invalid package name", 400);

  let exists = false;
  try {
    const res = await fetchUpstream(
      `${NPM_REGISTRY}/${encodeURIComponent(packageName)}`,
    );

    await res.body?.cancel();
    exists = res.ok;
  } catch {
    return bad("Could not verify package right now. Try again.", 502);
  }

  if (!exists) {
    return json({
      ok: false,
      code: "NOT_FOUND",
      message: "Package not found in npm registry (typo?)",
      packageName,
      registry,
    }, 200);
  }

  // Insert. If it exists already, return a warning response.
  const { data, error } = await supabase
    .from("ensured_packages")
    .insert({ user_id, registry, package_name: packageName })
    .select("*")
    .single();

  if (error) {
    // Postgres unique violation
    // supabase-js typically exposes error.code as string
    if ((error as any).code === "23505") {
      return json({
        ok: true,
        code: "ALREADY_EXISTS",
        message: "Package is already registered",
        packageName,
        registry,
      }, 200);
    }

    return failed("ensure_package insert", error);
  }

  return json({
    ok: true,
    code: "INSERTED",
    message: "Registered",
    row: data,
  });
});
