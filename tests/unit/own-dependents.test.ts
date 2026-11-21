import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { linkOwnPackages } from '../../src/features/user/portfolio/link-own-packages';
import { dependsOn } from '../../src/services/npm/release-health/depends-on';

describe('dependsOn', () => {
  test('lists the dependencies, peer and optional ones, once, without dev ones', () => {
    assert.deepEqual(
      dependsOn({
        dependencies: { a: '1', b: '1' },
        peerDependencies: { b: '1', c: '1' },
        optionalDependencies: { d: '1' },
        devDependencies: { dev: '1' }
      } as Parameters<typeof dependsOn>[0]),
      ['a', 'b', 'c', 'd']
    );
  });

  test('is empty without a manifest or dependencies', () => {
    assert.deepEqual(dependsOn(), []);
    assert.deepEqual(dependsOn(null), []);
    assert.deepEqual(dependsOn({}), []);
  });
});

describe('linkOwnPackages', () => {
  test("links only the user's own packages, in the order given", () => {
    const pkg = (name: string, uses: string[]) => ({
      name,
      uses,
      usedBy: [] as string[]
    });
    const packages = [
      pkg('b', ['core']),
      pkg('core', ['core', 'left-pad']),
      pkg('a', ['core', 'left-pad']),
      pkg('c', [])
    ];

    linkOwnPackages(packages);

    assert.deepEqual(
      packages.map(({ name, uses, usedBy }) => [name, uses, usedBy]),
      [
        ['b', ['core'], []],
        ['core', [], ['b', 'a']],
        ['a', ['core'], []],
        ['c', [], []]
      ]
    );
  });
});
