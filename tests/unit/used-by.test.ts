import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import {
  packageUsedBy,
  usedByFrom,
  usedByUrl
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

  test('links to the full list with the name encoded', () => {
    assert.equal(
      usedByUrl('@phun-ky/speccer'),
      'https://packages.ecosyste.ms/registries/npmjs.org/packages/%40phun-ky%2Fspeccer/dependent_packages'
    );
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

  test("is null when ecosyste.ms fails or doesn't know the package", async () => {
    respond(() => new Response('', { status: 404 }));
    assert.equal(await packageUsedBy('new-package'), null);

    respond(() => {
      throw new TypeError('Failed to fetch');
    });
    assert.equal(await packageUsedBy('offline'), null);
  });
});
