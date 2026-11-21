// The npm functions against #182 to #185 (#171): each one checks the name,
// survives npm failing, keeps npm's error text to itself, and uses the
// signed-in user's npm token.
import { assert, assertEquals, assertRejects } from "jsr:@std/assert@1";

import { downloadRange, rangePath } from "./download-range.ts";
import { fetchUpstream, isNpmUsername, isPackageName } from "./npm.ts";
import {
  jsonResponse,
  loadFunction,
  post,
  signedIn,
  SITE_ORIGIN,
  stubFetch,
  SUPABASE_URL,
} from "./test-utils.ts";

const REGISTRY = "https://registry.npmjs.org";
const SEARCH = `GET ${REGISTRY}/-/v1/search`;
const TOKEN_RPC = `POST ${SUPABASE_URL}/rest/v1/rpc/get_provider_token_secret`;
const OLD_TOKEN_RPC = `POST ${SUPABASE_URL}/rest/v1/rpc/get_active_provider_token_secret`;

type Fn = { name: string; body: (value: string) => unknown; npm: (value: string) => string };

const byName = (key: string) => (value: string) => ({ [key]: value });
const enc = encodeURIComponent;
const PACKAGE_FUNCTIONS: Fn[] = [
  { name: "npm-package-details", body: byName("name"), npm: (n) => `GET ${REGISTRY}/${enc(n)}` },
  { name: "npm-exists-package", body: byName("packageName"), npm: (n) => `GET ${REGISTRY}/${enc(n)}` },
  {
    name: "npm-downloads-last-month",
    body: byName("name"),
    npm: (n) => `GET https://api.npmjs.org/downloads/point/last-month/${enc(n)}`,
  },
  {
    name: "npm-downloads-last-year",
    body: byName("name"),
    npm: (n) =>
      `GET https://api.npmjs.org/downloads/range/${rangePath(downloadRange(new Date()))}/${enc(n)}`,
  },
  { name: "npm-dependents", body: byName("name"), npm: () => SEARCH },
];
const USER_FUNCTIONS: Fn[] = [
  { name: "npm-user-has-packages", body: byName("username"), npm: () => SEARCH },
  { name: "npm-search-by-user-role", body: byName("username"), npm: () => SEARCH },
];
const npmAnswer = () => jsonResponse({ objects: [], total: 0 });
const NPM_HOSTS = new Set(["registry.npmjs.org", "api.npmjs.org"]);
/** Whether a request stubFetch saw, "METHOD url", went to npm */
const asksNpm = (request: string) =>
  NPM_HOSTS.has(new URL(request.slice(request.indexOf(" ") + 1)).hostname);

Deno.test("isPackageName takes npm's names, old capitals too", () => {
  for (const name of ["@phun-ky/typeof", "JSONStream", "lodash.merge", "a-b_c~d"]) {
    assert(isPackageName(name), name);
  }

  for (const name of ["", "..", ".hidden", "_x", "a b", "<script>", "@a/b/c", "a".repeat(215), 42]) {
    assert(!isPackageName(name), String(name));
  }
});

Deno.test("isNpmUsername refuses spaces and search qualifiers", () => {
  for (const name of ["phun-ky", "isaacs", "a.b_c"]) assert(isNpmUsername(name), name);

  for (const name of ["", "phun-ky keywords:x", "a b", "<x>", "a".repeat(215), null]) {
    assert(!isNpmUsername(name), String(name));
  }
});

Deno.test("fetchUpstream gives up on a request that never answers", async () => {
  const original = globalThis.fetch;

  globalThis.fetch = (_input, init) =>
    new Promise((_resolve, reject) =>
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
    );

  try {
    await assertRejects(() => fetchUpstream("https://registry.npmjs.org/x", {}, 10));
  } finally {
    globalThis.fetch = original;
  }
});

// #185
for (const [fns, bad, good] of [
  [PACKAGE_FUNCTIONS, ["..", "a b", "<script>", "a".repeat(215)], ["@phun-ky/typeof", "JSONStream"]],
  [USER_FUNCTIONS, ["phun-ky keywords:x", "a b", "<x>"], ["phun-ky"]],
] as const) {
  for (const fn of fns) {
    Deno.test(`${fn.name}: refuses a malformed name with a 400, before asking npm`, async () => {
      const handler = await loadFunction(fn.name);

      for (const value of bad) {
        const fetch = stubFetch({ ...signedIn, [TOKEN_RPC]: () => jsonResponse(null) });

        try {
          const res = await handler(post(fn.body(value)));

          assertEquals(res.status, 400, value);
          assertEquals(fetch.requests.some(asksNpm), false);
        } finally {
          fetch.restore();
        }
      }

      for (const value of good) {
        const fetch = stubFetch({
          ...signedIn,
          [TOKEN_RPC]: () => jsonResponse(null),
          [fn.npm(value)]: npmAnswer,
        });

        try {
          const res = await handler(post(fn.body(value)));

          assertEquals(res.status, 200, value);
          await res.body?.cancel();
        } finally {
          fetch.restore();
        }
      }
    });
  }
}

for (const fn of [...PACKAGE_FUNCTIONS, ...USER_FUNCTIONS]) {
  const value = fn.name.includes("user") ? "phun-ky" : "@phun-ky/typeof";

  // #183
  Deno.test(`${fn.name}: answers with CORS when npm can't be reached`, async () => {
    const handler = await loadFunction(fn.name);
    const fetch = stubFetch({
      ...signedIn,
      [TOKEN_RPC]: () => jsonResponse(null),
      [fn.npm(value)]: () => Promise.reject(new TypeError("error sending request")),
    });

    try {
      const res = await handler(post(fn.body(value)));
      const body = await res.json();

      assertEquals(res.headers.get("access-control-allow-origin"), SITE_ORIGIN);
      assertEquals(body.ok, false);
      assert(res.status === 200 || res.status === 502, String(res.status));
    } finally {
      fetch.restore();
    }
  });

  // #182
  Deno.test(`${fn.name}: asks npm with the signed-in user's token`, async () => {
    const handler = await loadFunction(fn.name);
    const sent: (string | null)[] = [];
    const fetch = stubFetch({
      ...signedIn,
      [TOKEN_RPC]: () => jsonResponse("npm_secret"),
      [fn.npm(value)]: (req) => {
        sent.push(req.headers.get("authorization"));

        return npmAnswer();
      },
    });

    try {
      const res = await handler(post(fn.body(value)));

      await res.body?.cancel();
      assertEquals(sent[0], "Bearer npm_secret");
      assertEquals(fetch.requests.includes(OLD_TOKEN_RPC), false);
    } finally {
      fetch.restore();
    }
  });
}

// #184
for (const fn of PACKAGE_FUNCTIONS.slice(0, 4)) {
  Deno.test(`${fn.name}: keeps npm's error page and URL to itself`, async () => {
    const handler = await loadFunction(fn.name);
    const fetch = stubFetch({
      ...signedIn,
      [TOKEN_RPC]: () => jsonResponse(null),
      [fn.npm("speccer")]: () =>
        new Response("<html>cdn says no</html>", { status: 503 }),
    });

    try {
      const res = await handler(post(fn.body("speccer")));
      const text = await res.text();
      const body = JSON.parse(text);

      assertEquals(text.includes("cdn says no"), false);
      assertEquals(["body", "url"].filter((key) => key in body), []);
    } finally {
      fetch.restore();
    }
  });
}
