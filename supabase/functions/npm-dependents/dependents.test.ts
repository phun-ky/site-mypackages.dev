import { assertEquals, assertRejects } from "jsr:@std/assert@1";

import { npmDependents } from "./dependents.ts";

const answer = (body: unknown, status = 200) => {
  const requests: string[] = [];

  return {
    requests,
    fetch: ((input: string | URL | Request) => {
      requests.push(String(input));

      return Promise.resolve(Response.json(body, { status }));
    }) as typeof fetch,
  };
};

Deno.test("reads npm's count for the exact name, as a number or a string", async () => {
  const npm = answer({
    objects: [
      { package: { name: "@phun-ky/typeof-extra" }, dependents: 9 },
      { package: { name: "@phun-ky/typeof" }, dependents: "4" },
    ],
  });

  assertEquals(await npmDependents("@phun-ky/typeof", npm.fetch), 4);
  assertEquals(npm.requests, [
    "https://registry.npmjs.org/-/v1/search?text=%40phun-ky%2Ftypeof&size=10",
  ]);
});

Deno.test("is null when the search doesn't have the package or a count", async () => {
  assertEquals(await npmDependents("a", answer({ objects: [] }).fetch), null);
  assertEquals(await npmDependents("a", answer({}).fetch), null);
  assertEquals(
    await npmDependents("a", answer({ objects: [{ package: { name: "a" }, dependents: -1 }] }).fetch),
    null,
  );
  assertEquals(
    await npmDependents("a", answer({ objects: [{ package: { name: "a" } }] }).fetch),
    null,
  );
});

Deno.test("throws when npm fails", async () => {
  await assertRejects(() => npmDependents("a", answer({}, 503).fetch));
});
