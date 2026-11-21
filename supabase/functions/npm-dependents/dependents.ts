// How many packages on npm depend on a package, from npm's search, the only
// place npm gives the number. ecosyste.ms, which the site also asks, hasn't
// counted some packages' dependents. `fetch` is passed in, so tests can play
// npm.

const NPM_SEARCH = "https://registry.npmjs.org/-/v1/search";

/**
 * npm's count for `name`, or null when its search doesn't have the package.
 * Throws when npm doesn't answer.
 */
export const npmDependents = async (
  name: string,
  fetchFn: typeof fetch = fetch,
): Promise<number | null> => {
  const res = await fetchFn(
    `${NPM_SEARCH}?text=${encodeURIComponent(name)}&size=10`,
    { headers: { Accept: "application/json" } },
  );

  if (!res.ok) throw new Error(`npm search: ${res.status}`);

  const page = await res.json();
  // The exact name comes first, but other packages can match the text too
  const hit = Array.isArray(page?.objects)
    ? page.objects.find((o: { package?: { name?: unknown } }) => o?.package?.name === name)
    : undefined;
  // Seen as a string, like "3", too
  const n = Number(hit?.dependents);

  return hit && Number.isFinite(n) && n >= 0 ? n : null;
};
