import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { criticalPath } from './criticalPath';
import type { SchedulableTask } from './types';

const task = (id: string, estimatedHours: number, dependencies: string[] = []): SchedulableTask => ({
  id,
  priorityWeight: 2,
  estimatedHours,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  status: 'todo',
  dependencies,
});

describe('criticalPath', () => {
  it('computes the textbook example correctly', () => {
    // a(3) → b(2) → d(4) ; a(3) → c(1) → d(4). Longest chain a-b-d = 9.
    const result = criticalPath([task('a', 3), task('b', 2, ['a']), task('c', 1, ['a']), task('d', 4, ['b', 'c'])]);
    assert.equal(result.cycle, null);
    assert.equal(result.makespan, 9);
    assert.deepEqual(result.criticalPath, ['a', 'b', 'd']);

    const c = result.nodes.get('c')!;
    assert.equal(c.earliestStart, 3);
    assert.equal(c.earliestFinish, 4);
    assert.equal(c.latestFinish, 5);
    assert.equal(c.slack, 1);
    assert.equal(c.isCritical, false);

    const b = result.nodes.get('b')!;
    assert.equal(b.slack, 0);
    assert.equal(b.isCritical, true);
  });

  it('treats independent tasks as fully parallel', () => {
    const result = criticalPath([task('a', 5), task('b', 2), task('c', 7)]);
    assert.equal(result.makespan, 7);
    assert.deepEqual(result.criticalPath, ['c']);
    assert.equal(result.nodes.get('b')!.slack, 5);
  });

  it('uses the default duration for missing estimates', () => {
    const t = task('a', 0);
    t.estimatedHours = null;
    const result = criticalPath([t], { defaultDurationHours: 2.5 });
    assert.equal(result.makespan, 2.5);
  });

  it('gives completed prerequisites zero duration', () => {
    const done = { ...task('a', 8), status: 'completed' as const };
    const result = criticalPath([done, task('b', 2, ['a'])]);
    assert.equal(result.makespan, 2);
    assert.equal(result.nodes.get('b')!.earliestStart, 0);
  });

  it('refuses cyclic input and reports the cycle', () => {
    const result = criticalPath([task('a', 1, ['b']), task('b', 1, ['a'])]);
    assert.ok(result.cycle);
    assert.equal(result.makespan, 0);
    assert.deepEqual(result.criticalPath, []);
  });

  it('handles an empty project', () => {
    const result = criticalPath([]);
    assert.equal(result.makespan, 0);
    assert.deepEqual(result.criticalPath, []);
  });
});
