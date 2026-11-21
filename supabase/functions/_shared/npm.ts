// What the npm functions share (#171): checks for the names they send to npm,
// a fetch that gives up, and the signed-in user's npm token.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// What npm accepts as a package name: an optional scope, then URL-safe
// characters (validate-npm-package-name). Any case, since old packages can
// have capitals, like JSONStream.
// shortcut: refuses the few old names with ' ! ( or ), add them if one turns up
const PACKAGE_NAME =
  /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/i;

export const isPackageName = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 214 && PACKAGE_NAME.test(value);

// npm usernames: letters, digits, dots, dashes and underscores. No spaces, so
// a username can't add qualifiers to `maintainer:<username>`.
export const isNpmUsername = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 214 &&
  /^[a-z0-9._-]+$/i.test(value);

/** How long a function waits for npm before it gives up. */
export const UPSTREAM_TIMEOUT_MS = 8000;

/** fetch that gives up after `ms`, so a slow npm can't hold a function. */
export const fetchUpstream = (
  input: string | URL | Request,
  init: RequestInit = {},
  ms = UPSTREAM_TIMEOUT_MS,
) => fetch(input, { ...init, signal: AbortSignal.timeout(ms) });

/**
 * The signed-in caller's active npm token, or null. The user is verified with
 * their JWT, then the token is read with the service role for that user:
 * signed-in users can't read stored tokens themselves.
 */
export const npmTokenFor = async (req: Request): Promise<string | null> => {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await userClient.auth.getUser();

  if (userErr || !user) return null;

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await admin.rpc("get_provider_token_secret", {
    p_user_id: user.id,
    p_provider: "npm",
  });

  return !error && typeof data === "string" && data.trim() ? data.trim() : null;
};
