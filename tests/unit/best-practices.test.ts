import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test } from 'node:test';

import {
  bestPracticesFromProjects,
  bestPracticesUrl,
  packageBestPractices,
  type BestPracticesProject
} from '../../src/services/package/best-practices';

const project = (
  badge_level: string,
  tiered_percentage: number
): BestPracticesProject => ({
  id: 63,
  badge_level,
  tiered_percentage,
  baseline_tiered_percentage: 0
});

describe('bestPracticesFromProjects', () => {
  for (const [level, label] of [
    ['passing', 'Passing'],
    ['silver', 'Silver'],
    ['gold', 'Gold']
  ]) {
    test(`maps ${level}`, () => {
      const result = bestPracticesFromProjects([project(level, 100)]);

      assert.equal(result.key, level);
      assert.equal(result.label, label);
      assert.deepEqual(result.meta, { id: 63, tieredPct: 100, baselinePct: 0 });
      assert.equal(
        bestPracticesUrl(63),
        'https://www.bestpractices.dev/projects/63'
      );
    });
  }

  test('maps in progress with the share of the passing criteria met', () => {
    const result = bestPracticesFromProjects([project('in_progress', 60)]);

    assert.equal(result.key, 'in_progress');
    assert.equal(result.label, 'In progress 60%');
  });

  test('never says 100% for a project still in progress', () => {
    assert.equal(
      bestPracticesFromProjects([project('in_progress', 99.6)]).label,
      'In progress 99%'
    );
  });

  test('an unexpected level is in progress, with missing numbers as 0', () => {
    const result = bestPracticesFromProjects([
      { id: 1, badge_level: 'constructor' } as BestPracticesProject
    ]);

    assert.equal(result.key, 'in_progress');
    assert.deepEqual(result.meta, { id: 1, tieredPct: 0, baselinePct: 0 });
  });

  test('an empty list is not registered', () => {
    const result = bestPracticesFromProjects([]);

    assert.equal(result.key, 'none');
    assert.equal(result.meta, undefined);
  });
});

describe('packageBestPractices', () => {
  const realFetch = globalThis.fetch;
  const requested: string[] = [];
  const respond = (response: () => Response) => {
    globalThis.fetch = (async (url: string) => {
      requested.push(url);

      return response();
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

  test('looks the repository up by its encoded URL, keeping a few fields', async () => {
    respond(() =>
      Response.json([{ ...project('gold', 300), name: 'curl', extra: 'x' }])
    );

    const result = await packageBestPractices('https://github.com/a/gold');

    assert.equal(result.key, 'gold');
    assert.deepEqual(requested, [
      'https://www.bestpractices.dev/projects.json?url=https%3A%2F%2Fgithub.com%2Fa%2Fgold'
    ]);
    assert.deepEqual(JSON.parse([...stored.values()][0]).v, [
      project('gold', 300)
    ]);

    // Cached, so not asked again
    assert.equal(
      (await packageBestPractices('https://github.com/a/gold')).key,
      'gold'
    );
    assert.equal(requested.length, 1);
  });

  test('is not registered when the list is empty', async () => {
    respond(() => Response.json([]));

    assert.equal(
      (await packageBestPractices('https://github.com/a/none')).key,
      'none'
    );
  });

  test('is unknown on an error status, a network error or odd JSON', async () => {
    respond(() => new Response('', { status: 500 }));
    assert.equal(
      (await packageBestPractices('https://github.com/a/500')).key,
      'unknown'
    );

    respond(() => {
      throw new TypeError('Failed to fetch');
    });
    assert.equal(
      (await packageBestPractices('https://github.com/a/offline')).key,
      'unknown'
    );

    respond(() => Response.json({ error: 'x' }));
    assert.equal(
      (await packageBestPractices('https://github.com/a/object')).key,
      'unknown'
    );
  });

  test('is unknown without a repository, and asks nothing', async () => {
    respond(() => Response.json([]));

    assert.equal((await packageBestPractices(undefined)).key, 'unknown');
    assert.deepEqual(requested, []);
  });
});
