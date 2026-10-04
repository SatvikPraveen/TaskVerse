import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { forecastCompletion } from './forecast';

describe('forecastCompletion', () => {
  it('is exact for constant throughput', () => {
    const result = forecastCompletion({ remainingItems: 10, throughputSamples: [2, 2, 2], trials: 200 })!;
    assert.equal(result.percentiles.p50, 5);
    assert.equal(result.percentiles.p95, 5);
    assert.equal(result.meanPeriods, 5);
    assert.deepEqual(result.histogram, [{ periods: 5, count: 200 }]);
  });

  it('produces monotone percentiles under variable throughput', () => {
    const result = forecastCompletion({ remainingItems: 40, throughputSamples: [0, 1, 1, 2, 3, 5], seed: 7 })!;
    const { p50, p70, p85, p95 } = result.percentiles;
    assert.ok(p50 <= p70 && p70 <= p85 && p85 <= p95);
    assert.ok(p50 >= 40 / 5 && p95 <= 40 / 1 + 1);
    assert.equal(result.truncatedShare, 0);
  });

  it('is reproducible for the same seed and differs across seeds', () => {
    const a = forecastCompletion({ remainingItems: 30, throughputSamples: [1, 2, 3], seed: 1, trials: 500 })!;
    const b = forecastCompletion({ remainingItems: 30, throughputSamples: [1, 2, 3], seed: 1, trials: 500 })!;
    const c = forecastCompletion({ remainingItems: 30, throughputSamples: [1, 2, 3], seed: 2, trials: 500 })!;
    assert.deepEqual(a, b);
    assert.notDeepEqual(a.histogram, c.histogram);
  });

  it('returns null without usable history', () => {
    assert.equal(forecastCompletion({ remainingItems: 5, throughputSamples: [] }), null);
    assert.equal(forecastCompletion({ remainingItems: 5, throughputSamples: [0, 0] }), null);
  });

  it('short-circuits when nothing remains', () => {
    const result = forecastCompletion({ remainingItems: 0, throughputSamples: [1] })!;
    assert.equal(result.percentiles.p95, 0);
  });

  it('reports truncation when work cannot finish within the cap', () => {
    const result = forecastCompletion({
      remainingItems: 100,
      throughputSamples: [0, 0, 0, 0, 1],
      trials: 100,
      maxPeriods: 50,
    })!;
    assert.ok(result.truncatedShare > 0.9);
  });
});
