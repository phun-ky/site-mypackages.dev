import { cachedAsync } from '../../utils/storage/cached-async';

// Which packages depend on a package (#160), from ecosyste.ms: the counts for
// the whole package, and the most downloaded dependents. ecosyste.ms hasn't
// counted some packages' dependents, so npm's own count is used where it's
// higher. deps.dev counts per version, so a new release looks unused there.

export type UsedBy = {
  /** Packages on npm that depend on it */
  packages: number;
  /** Repositories that depend on it */
  repos: number;
  /** The most downloaded dependents, without spam */
  names: string[];
};

const API = 'https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages';
// Mass-published packages that depend on everything
const SPAM = /^@everything-registry\/|\/nolb-/;
const memCache = new Map<string, Promise<UsedBy> | UsedBy>();
const count = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0;

/** All of them, on npm, which has them even when ecosyste.ms doesn't */
export const usedByUrl = (name: string) =>
  `https://www.npmjs.com/package/${name.split('/').map(encodeURIComponent).join('/')}?activeTab=dependents`;

/**
 * npm's count where it's higher than ecosyste.ms's, or where ecosyste.ms
 * couldn't be reached
 */
export const withNpmCount = (
  usedBy: UsedBy | null,
  npm: number | null
): UsedBy | null =>
  npm === null
    ? usedBy
    : {
        packages: Math.max(usedBy?.packages ?? 0, npm),
        repos: usedBy?.repos ?? 0,
        names: usedBy?.names ?? []
      };

export const usedByFrom = (pkg: unknown, dependents: unknown): UsedBy => {
  const counts = (pkg ?? {}) as Record<string, unknown>;
  const names = Array.isArray(dependents)
    ? dependents
        .map((d) => d?.name)
        .filter((n): n is string => typeof n === 'string' && !SPAM.test(n))
    : [];

  return {
    packages: count(counts.dependent_packages_count),
    repos: count(counts.dependent_repos_count),
    names
  };
};

const getJson = async (url: string, signal: AbortSignal) => {
  const res = await fetch(url, { signal });

  if (!res.ok) throw new Error(`ecosyste.ms: ${res.status}`);

  return res.json();
};

/** null when ecosyste.ms can't be reached, or doesn't know the package */
export const packageUsedBy = async (
  name: string,
  signal?: AbortSignal
): Promise<UsedBy | null> => {
  // Each response is about 20 to 60 KB compressed, and only this section
  // depends on them, so they may not hold up the page for long
  const timeout = AbortSignal.timeout(5000);
  const both = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const base = `${API}/${encodeURIComponent(name)}`;

  try {
    return await cachedAsync(
      memCache,
      `used-by:${name}`,
      undefined,
      async () => {
        const [pkg, dependents] = await Promise.all([
          getJson(base, both),
          getJson(
            `${base}/dependent_packages?per_page=10&sort=downloads&order=desc`,
            both
          )
        ]);

        return usedByFrom(pkg, dependents);
      }
    );
  } catch {
    return null;
  }
};
