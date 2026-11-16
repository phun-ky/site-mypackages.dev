import { cachedAsync } from '../../utils/storage/cached-async';

// The OpenSSF Best Practices badge for a package's repository (#159). Shown
// next to the health score, not weighted into it: few projects register, and
// the badge is the maintainers' own assessment of the whole repository.

export type BestPracticesKey =
  'none' | 'in_progress' | 'passing' | 'silver' | 'gold' | 'unknown';

export type BestPracticesResult = {
  key: BestPracticesKey;
  label: string;
  title: string;
  meta?: { id: number; tieredPct: number; baselinePct: number };
};

/** The fields kept from a project, about 40 KB each in the response */
export type BestPracticesProject = {
  id: number;
  badge_level: string;
  tiered_percentage: number;
  baseline_tiered_percentage: number;
};

const ENDPOINT = 'https://www.bestpractices.dev/projects.json';
const LEVELS: Readonly<Record<string, string>> = Object.freeze({
  passing: 'Passing',
  silver: 'Silver',
  gold: 'Gold'
});
const memCache = new Map<
  string,
  Promise<BestPracticesProject[]> | BestPracticesProject[]
>();
const pct = (n: unknown) =>
  typeof n === 'number' && Number.isFinite(n) ? n : 0;
const UNKNOWN: BestPracticesResult = {
  key: 'unknown',
  label: 'Unknown',
  title: "Couldn't check OpenSSF Best Practices"
};

export const bestPracticesUrl = (id: number) =>
  `https://www.bestpractices.dev/projects/${id}`;

export const bestPracticesFromProjects = (
  projects: BestPracticesProject[]
): BestPracticesResult => {
  const [project] = projects;

  if (!project || typeof project.id !== 'number') {
    return {
      key: 'none',
      label: 'Not registered',
      title: 'Not registered for an OpenSSF Best Practices badge'
    };
  }

  const meta = {
    id: project.id,
    tieredPct: pct(project.tiered_percentage),
    baselinePct: pct(project.baseline_tiered_percentage)
  };
  const level = project.badge_level;

  if (Object.hasOwn(LEVELS, level)) {
    return {
      key: level as BestPracticesKey,
      label: LEVELS[level],
      title: `OpenSSF Best Practices badge: ${LEVELS[level].toLowerCase()} (self-assessed)`,
      meta
    };
  }

  // Under 100 is the share of the passing criteria met
  const done = Math.min(Math.round(meta.tieredPct), 99);

  return {
    key: 'in_progress',
    label: `In progress ${done}%`,
    title: `OpenSSF Best Practices badge in progress, ${done}% of the passing criteria met (self-assessed)`,
    meta
  };
};

const fetchProjects = async (
  repoUrl: string,
  signal?: AbortSignal
): Promise<BestPracticesProject[]> => {
  // Only a chip depends on it, so it may not hold up the page for long
  const timeout = AbortSignal.timeout(3000);
  // Encoded, or the site redirects to the encoded URL first
  const res = await fetch(`${ENDPOINT}?url=${encodeURIComponent(repoUrl)}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout
  });

  if (!res.ok) throw new Error(`bestpractices.dev: ${res.status}`);

  const json: unknown = await res.json();

  if (!Array.isArray(json)) throw new Error('bestpractices.dev: not a list');

  return json.map((p) => ({
    id: p?.id,
    badge_level: p?.badge_level,
    tiered_percentage: p?.tiered_percentage,
    baseline_tiered_percentage: p?.baseline_tiered_percentage
  }));
};

/**
 * Looks the repository up on bestpractices.dev, which matches the URL
 * exactly, like `https://github.com/owner/repo`.
 */
export const packageBestPractices = async (
  repoUrl: string | undefined,
  signal?: AbortSignal
): Promise<BestPracticesResult> => {
  if (!repoUrl) return UNKNOWN;

  try {
    const projects = await cachedAsync(
      memCache,
      `best-practices:${repoUrl}`,
      undefined,
      () => fetchProjects(repoUrl, signal)
    );

    return bestPracticesFromProjects(projects);
  } catch {
    return UNKNOWN;
  }
};
