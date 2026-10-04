import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildGraph,
  findCycle,
  readyTasks,
  topologicalOrder,
  transitiveDependentCount,
  wouldCreateCycle,
} from './graph';
import type { SchedulableTask } from './types';

const task = (id: string, dependencies: string[] = [], status: SchedulableTask['status'] = 'todo'): SchedulableTask => ({
  id,
  priorityWeight: 2,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  status,
  dependencies,
});

describe('buildGraph', () => {
  it('indexes prerequisites and dependents symmetrically', () => {
    const g = buildGraph([task('a'), task('b', ['a']), task('c', ['a', 'b'])]);
    assert.deepEqual([...g.prerequisites.get('c')!], ['a', 'b']);
    assert.deepEqual([...g.dependents.get('a')!], ['b', 'c']);
  });

  it('records unknown dependency ids instead of throwing', () => {
    const g = buildGraph([task('a', ['ghost'])]);
    assert.deepEqual([...g.missing], ['ghost']);
    assert.equal(g.prerequisites.get('a')!.size, 0);
  });

  it('drops self-loops', () => {
    const g = buildGraph([task('a', ['a'])]);
    assert.equal(g.prerequisites.get('a')!.size, 0);
    assert.equal(findCycle(g), null);
  });
});

describe('topologicalOrder', () => {
  it('places every prerequisite before its dependents', () => {
    const tasks = [task('d', ['b', 'c']), task('c', ['a']), task('b', ['a']), task('a')];
    const { order, cycle } = topologicalOrder(buildGraph(tasks));
    assert.equal(cycle, null);
    const pos = new Map(order.map((id, i) => [id, i]));
    assert.ok(pos.get('a')! < pos.get('b')!);
    assert.ok(pos.get('a')! < pos.get('c')!);
    assert.ok(pos.get('b')! < pos.get('d')!);
    assert.ok(pos.get('c')! < pos.get('d')!);
  });

  it('is deterministic for identical input', () => {
    const tasks = [task('x'), task('y'), task('z', ['x'])];
    const a = topologicalOrder(buildGraph(tasks)).order;
    const b = topologicalOrder(buildGraph(tasks)).order;
    assert.deepEqual(a, b);
  });

  it('reports a cycle and returns an empty order', () => {
    const g = buildGraph([task('a', ['c']), task('b', ['a']), task('c', ['b'])]);
    const { order, cycle } = topologicalOrder(g);
    assert.deepEqual(order, []);
    assert.ok(cycle);
    assert.equal(cycle!.length, 3);
    assert.deepEqual([...cycle!].sort(), ['a', 'b', 'c']);
  });
});

describe('wouldCreateCycle', () => {
  const g = buildGraph([task('a'), task('b', ['a']), task('c', ['b'])]);

  it('rejects a self dependency', () => {
    assert.equal(wouldCreateCycle(g, 'a', 'a'), true);
  });

  it('rejects making a prerequisite depend on its (transitive) dependent', () => {
    assert.equal(wouldCreateCycle(g, 'a', 'c'), true);
    assert.equal(wouldCreateCycle(g, 'b', 'c'), true);
  });

  it('allows edges that keep the graph acyclic', () => {
    assert.equal(wouldCreateCycle(g, 'c', 'a'), false);
    const h = buildGraph([task('a'), task('b'), task('c')]);
    assert.equal(wouldCreateCycle(h, 'a', 'b'), false);
  });
});

describe('transitiveDependentCount', () => {
  it('counts every downstream task exactly once', () => {
    const g = buildGraph([task('a'), task('b', ['a']), task('c', ['a']), task('d', ['b', 'c'])]);
    assert.equal(transitiveDependentCount(g, 'a'), 3);
    assert.equal(transitiveDependentCount(g, 'b'), 1);
    assert.equal(transitiveDependentCount(g, 'd'), 0);
  });
});

describe('readyTasks', () => {
  it('returns only unfinished tasks whose prerequisites are finished', () => {
    const g = buildGraph([
      task('done', [], 'completed'),
      task('ready', ['done']),
      task('blocked', ['ready']),
      task('cancelledDep', [], 'cancelled'),
      task('alsoReady', ['cancelledDep']),
    ]);
    assert.deepEqual(readyTasks(g).map(t => t.id).sort(), ['alsoReady', 'ready']);
  });
});
