import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import {
  packageUsedBy,
  usedByFrom,
  usedByUrl,
  withNpmCount
} from '../../src/services/package/used-by';

describe('usedByFrom', () => {
  test('keeps the counts and the names, without spam', () => {
    assert.deepEqual(
      usedByFrom({ dependent_packages_count: 12, dependent_repos_count: 3 }, [
        { name: 'prompts' },
        { name: '@everything-registry/sub-chunk-717' },
        { name: '@zalastax/nolb-_phu' },
        { name: '@scope/uses-it' }
      ]),
      { packages: 12, repos: 3, names: ['prompts', '@scope/uses-it'] }
    );
  });

  test('reads odd answers as no dependents', () => {
    const none = { packages: 0, repos: 0, names: [] };

    assert.deepEqual(usedByFrom(null, null), none);
    assert.deepEqual(
      usedByFrom({ dependent_packages_count: -1, dependent_repos_count: '5' }, [
        null,
        { name: 42 }
      ]),
      none
    );
  });

  test("links to the full list on npm, with the scope's slash kept", () => {
    assert.equal(
      usedByUrl('@phun-ky/speccer'),
      'https://www.npmjs.com/package/%40phun-ky/speccer?activeTab=dependents'
    );
  });
});

describe('withNpmCount', () => {
  const ecosystems = { packages: 2, repos: 3, names: ['a', 'b'] };

  test("takes npm's count where it's higher, and keeps the rest", () => {
    assert.deepEqual(withNpmCount(ecosystems, 4), {
      ...ecosystems,
      packages: 4
    });
    assert.deepEqual(withNpmCount(ecosystems, 1), ecosystems);
  });

  test("gives npm's count when ecosyste.ms couldn't be reached", () => {
    assert.deepEqual(withNpmCount(null, 4), {
      packages: 4,
      repos: 0,
      names: []
    });
  });

  test("leaves it as it was without npm's count", () => {
    assert.equal(withNpmCount(ecosystems, null), ecosystems);
    assert.equal(withNpmCount(null, null), null);
  });
});

describe('packageUsedBy', () => {
  const realFetch = globalThis.fetch;
  const requested: string[] = [];
  const respond = (response: (url: string) => Response) => {
    globalThis.fetch = (async (url: string) => {
      requested.push(url);

      return response(url);
    }) as typeof fetch;
  };
  const stored = new Map<string, string>();

  // localStorage isn't in Node
  beforeEach(() => {
    requested.length = 0;
    stored.clear();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        get length() {
          return stored.size;
        },
        key: (i: number) => [...stored.keys()][i] ?? null,
        getItem: (k: string) => stored.get(k) ?? null,
        setItem: (k: string, v: string) => void stored.set(k, v),
        removeItem: (k: string) => void stored.delete(k)
      },
      configurable: true
    });
  });
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  test('asks for the counts and the most downloaded dependents, once', async () => {
    respond((url) =>
      url.includes('/dependent_packages')
        ? Response.json([{ name: 'prompts', downloads: 1 }])
        : Response.json({
            dependent_packages_count: 5,
            dependent_repos_count: 2
          })
    );

    const expected = { packages: 5, repos: 2, names: ['prompts'] };

    assert.deepEqual(await packageUsedBy('@a/kleur'), expected);
    assert.deepEqual(requested.sort(), [
      'https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/%40a%2Fkleur',
      'https://packages.ecosyste.ms/api/v1/registries/npmjs.org/packages/%40a%2Fkleur/dependent_packages?per_page=10&sort=downloads&order=desc'
    ]);
    assert.deepEqual(JSON.parse([...stored.values()][0]).v, expected);

    // Cached, so not asked again
    assert.deepEqual(await packageUsedBy('@a/kleur'), expected);
    assert.equal(requested.length, 2);
  });

  test('stops asking when the caller aborts', async () => {
    const signals: (AbortSignal | null | undefined)[] = [];

    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      signals.push(init?.signal);
      init?.signal?.throwIfAborted();

      return Response.json({});
    }) as typeof fetch;

    assert.equal(await packageUsedBy('left', AbortSignal.abort()), null);
    assert.equal(signals.length, 2);
    assert.ok(signals.every((signal) => signal?.aborted));
  });

  test("is null when ecosyste.ms fails or doesn't know the package", async () => {
    respond(() => new Response('', { status: 404 }));
    assert.equal(await packageUsedBy('new-package'), null);

    respond(() => {
      throw new TypeError('Failed to fetch');
    });
    assert.equal(await packageUsedBy('offline'), null);
  });
});
