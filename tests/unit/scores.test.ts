import * as fc from 'fast-check';

import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DAY_MS } from '../../src/constants/temporal';
import { packageHealth } from '../../src/services/package/health';
import { packagePopularity } from '../../src/services/package/popularity';
import { scoreCadence } from '../../src/utils/score-cadence';
import { scoreRecency } from '../../src/utils/score-recency';

const inRange = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
// Any score a metric could report, including ones out of range or not a number
const anyScore = fc.oneof(
  fc.double(),
  fc.constantFrom(Number.NaN, Infinity, -Infinity, undefined)
);
const metric = fc.option(
  fc.record({
    scorePct: anyScore,
    key: fc.option(fc.constantFrom('deprecated', 'fresh', 'risk'), {
      nil: undefined
    })
  }),
  { nil: undefined }
);

describe('scoreRecency', () => {
  test('stays in range and never rises with age', () => {
    fc.assert(
      fc.property(fc.nat({ max: 5000 }), fc.nat({ max: 5000 }), (a, b) => {
        const [younger, older] = a <= b ? [a, b] : [b, a];

        assert.ok(inRange(scoreRecency(younger)));
        assert.ok(scoreRecency(older) <= scoreRecency(younger));
      })
    );
  });

  // Each step and its edges, so coverage doesn't depend on which ages the
  // property above happens to draw
  test('steps down at 14, 60, 180 and 365 days', () => {
    const steps: [ageDays: number, score: number][] = [
      [0, 100],
      [14, 100],
      [15, 90],
      [60, 90],
      [61, 60],
      [180, 60],
      [181, 35],
      [365, 35],
      [366, 15]
    ];

    for (const [ageDays, score] of steps) {
      assert.equal(scoreRecency(ageDays), score, `${ageDays} days`);
    }
  });
});

describe('scoreCadence', () => {
  test('stays in range and never rises as releases slow down', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }),
        fc.integer({ min: 1, max: 1000 }),
        (a, b) => {
          const [faster, slower] = a <= b ? [a, b] : [b, a];

          assert.ok(inRange(scoreCadence(faster * DAY_MS)));
          assert.ok(
            scoreCadence(slower * DAY_MS) <= scoreCadence(faster * DAY_MS)
          );
        }
      )
    );
  });

  // Each step and its edges, so coverage doesn't depend on which cadences the
  // property above happens to draw
  test('steps down at 7, 14, 30, 60 and 120 days', () => {
    const steps: [cadenceDays: number, score: number][] = [
      [1, 95],
      [7, 95],
      [8, 90],
      [14, 90],
      [15, 80],
      [30, 80],
      [31, 65],
      [60, 65],
      [61, 50],
      [120, 50],
      [121, 35]
    ];

    for (const [cadenceDays, score] of steps) {
      assert.equal(
        scoreCadence(cadenceDays * DAY_MS),
        score,
        `${cadenceDays} days`
      );
    }
  });

  test('is neutral when the cadence is unknown', () => {
    assert.equal(scoreCadence(undefined), 50);
    assert.equal(scoreCadence(null), 50);
    assert.equal(scoreCadence(0), 50);
  });
});

describe('packagePopularity', () => {
  test('stays in range and never falls with more downloads', () => {
    fc.assert(
      fc.property(fc.nat({ max: 1e10 }), fc.nat({ max: 1e10 }), (a, b) => {
        const [fewer, more] = a <= b ? [a, b] : [b, a];
        const low = packagePopularity(fewer).scorePct;
        const high = packagePopularity(more).scorePct;

        assert.ok(inRange(low) && inRange(high));
        assert.ok(high >= low);
      })
    );
  });

  test('labels by the download thresholds', () => {
    assert.equal(packagePopularity(99).label, 'low');
    assert.equal(packagePopularity(100).label, 'relative-low');
    assert.equal(packagePopularity(10_000).label, 'decent');
  });

  test('gives a change only with a previous period, never Infinity', () => {
    assert.equal(packagePopularity(10).changePct, undefined);
    assert.equal(packagePopularity(150, 100).changePct, 50);
    assert.equal(packagePopularity(5, 0).changePct, 100);
    assert.equal(packagePopularity(0, 0).changePct, 0);
  });
});

describe('packageHealth', () => {
  test('gives a score and a confidence in range for any metrics', () => {
    fc.assert(
      fc.property(
        fc.record({
          maintenance: metric,
          popularity: metric,
          quality: metric,
          security: metric,
          provenance: metric
        }),
        (args) => {
          const health = packageHealth(args);

          assert.ok(inRange(health.scorePct), `score ${health.scorePct}`);
          assert.ok(inRange(health.confidencePct));
        }
      )
    );
  });

  test('is unknown without metrics', () => {
    assert.deepEqual(packageHealth({}), {
      scorePct: 50,
      label: 'Unknown',
      confidencePct: 0,
      meta: { weighted: {}, weightsUsed: {} }
    });
  });

  test('never calls a deprecated package healthy', () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 100 }), (score) => {
        const health = packageHealth({
          maintenance: { scorePct: score, key: 'deprecated' },
          quality: { scorePct: 100 },
          security: { scorePct: 100 }
        });

        assert.ok(health.scorePct <= 15);
        assert.equal(health.label, 'Poor');
      })
    );
  });

  test('caps a risky package, however good the rest is', () => {
    const health = packageHealth({
      maintenance: { scorePct: 100 },
      quality: { scorePct: 100 },
      popularity: { scorePct: 100 },
      security: { scorePct: 30 },
      provenance: { scorePct: 100 }
    });

    assert.ok(health.scorePct <= 55);
  });

  test('caps a package to watch at 75', () => {
    const health = packageHealth({
      maintenance: { scorePct: 100 },
      quality: { scorePct: 100 },
      popularity: { scorePct: 100 },
      security: { scorePct: 50 },
      provenance: { scorePct: 100 }
    });

    assert.equal(health.scorePct, 75);
    assert.equal(health.label, 'Good');
  });

  // With one metric, the score is that metric's. Random metrics are mostly
  // clamped to 0 or 100, so the labels in between are tested here.
  test('labels scores at 85, 70 and 50', () => {
    const labels: [scorePct: number, label: string][] = [
      [100, 'Excellent'],
      [85, 'Excellent'],
      [84, 'Good'],
      [70, 'Good'],
      [69, 'OK'],
      [50, 'OK'],
      [49, 'Poor'],
      [0, 'Poor']
    ];

    for (const [scorePct, label] of labels) {
      const health = packageHealth({ quality: { scorePct } });

      assert.equal(health.scorePct, scorePct);
      assert.equal(health.label, label, `score ${scorePct}`);
    }
  });
});
