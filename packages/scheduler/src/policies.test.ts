import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { classifyEisenhower, edf, eisenhower, fifo, getPolicy, POLICY_NAMES, priority, spt, wsjf } from './policies';
import { MS_PER_HOUR, type SchedulableTask } from './types';

const now = new Date('2026-01-05T09:00:00.000Z');
const hours = (h: number) => new Date(now.getTime() + h * MS_PER_HOUR);

let counter = 0;
const task = (overrides: Partial<SchedulableTask> = {}): SchedulableTask => {
  counter += 1;
  return {
    id: overrides.id ?? `t${counter}`,
    priorityWeight: 2,
    createdAt: hours(-counter),
    status: 'todo',
    ...overrides,
  };
};

describe('policy registry', () => {
  it('exposes every named policy', () => {
    for (const name of POLICY_NAMES) assert.equal(typeof getPolicy(name), 'function');
    assert.throws(() => getPolicy('nope'), RangeError);
  });

  it('assigns dense, 1-based ranks', () => {
    const ranked = fifo([task(), task(), task()], { now });
    assert.deepEqual(ranked.map(r => r.rank), [1, 2, 3]);
  });
});

describe('fifo', () => {
  it('orders by creation time, oldest first', () => {
    const old = task({ id: 'old', createdAt: hours(-100) });
    const young = task({ id: 'young', createdAt: hours(-1) });
    assert.deepEqual(fifo([young, old], { now }).map(r => r.task.id), ['old', 'young']);
  });
});

describe('priority', () => {
  it('orders by weight then due date', () => {
    const a = task({ id: 'a', priorityWeight: 4 });
    const b = task({ id: 'b', priorityWeight: 2, dueDate: hours(5) });
    const c = task({ id: 'c', priorityWeight: 2, dueDate: hours(1) });
    assert.deepEqual(priority([b, c, a], { now }).map(r => r.task.id), ['a', 'c', 'b']);
  });
});

describe('spt', () => {
  it('prefers the shortest job', () => {
    const big = task({ id: 'big', estimatedHours: 8 });
    const small = task({ id: 'small', estimatedHours: 1 });
    const unknown = task({ id: 'unknown' });
    const ranked = spt([big, unknown, small], { now, defaultEstimateHours: 3 });
    assert.deepEqual(ranked.map(r => r.task.id), ['small', 'unknown', 'big']);
  });
});

describe('edf', () => {
  it('orders by deadline and puts undated tasks last', () => {
    const late = task({ id: 'late', dueDate: hours(-2) });
    const soon = task({ id: 'soon', dueDate: hours(3) });
    const later = task({ id: 'later', dueDate: hours(30) });
    const none = task({ id: 'none', priorityWeight: 4 });
    assert.deepEqual(edf([none, later, soon, late], { now }).map(r => r.task.id), ['late', 'soon', 'later', 'none']);
  });

  it('explains overdue tasks', () => {
    const [top] = edf([task({ dueDate: hours(-2) })], { now });
    assert.match(top.rationale, /Overdue by 2h/);
  });
});

describe('wsjf', () => {
  it('scores cost of delay divided by job size', () => {
    const [r] = wsjf([task({ id: 'x', priorityWeight: 3, estimatedHours: 2 })], { now });
    // value 3, no deadline → criticality 0, no dependents → CoD 3, size 2.
    assert.equal(r.components.costOfDelay, 3);
    assert.equal(r.components.jobSizeHours, 2);
    assert.equal(r.score, 1.5);
  });

  it('ramps time criticality to 4 at the deadline and saturates when overdue', () => {
    const atDeadline = wsjf([task({ dueDate: hours(0), estimatedHours: 1 })], { now })[0];
    assert.equal(atDeadline.components.timeCriticality, 4);
    const farAway = wsjf([task({ dueDate: hours(1000), estimatedHours: 1 })], { now })[0];
    assert.equal(farAway.components.timeCriticality, 0);
    const overdue = wsjf([task({ dueDate: hours(-168), estimatedHours: 1 })], { now })[0];
    assert.equal(overdue.components.timeCriticality, 5);
  });

  it('rewards tasks that unblock others', () => {
    const root = task({ id: 'root', estimatedHours: 1 });
    const leafA = task({ id: 'leafA', estimatedHours: 1, dependencies: ['root'] });
    const leafB = task({ id: 'leafB', estimatedHours: 1, dependencies: ['leafA'] });
    const ranked = wsjf([leafB, leafA, root], { now });
    assert.equal(ranked[0].task.id, 'root');
    assert.equal(ranked[0].components.riskReduction, 2);
  });

  it('prefers a small urgent job over a large valuable one', () => {
    const smallUrgent = task({ id: 'small', priorityWeight: 1, estimatedHours: 0.5, dueDate: hours(2) });
    const bigValuable = task({ id: 'big', priorityWeight: 4, estimatedHours: 16 });
    assert.equal(wsjf([bigValuable, smallUrgent], { now })[0].task.id, 'small');
  });
});

describe('eisenhower', () => {
  it('classifies quadrants from importance and urgency', () => {
    assert.equal(classifyEisenhower(task({ priorityWeight: 4, dueDate: hours(10) }), { now }).quadrant, 'do_first');
    assert.equal(classifyEisenhower(task({ priorityWeight: 4, dueDate: hours(200) }), { now }).quadrant, 'schedule');
    assert.equal(classifyEisenhower(task({ priorityWeight: 1, dueDate: hours(10) }), { now }).quadrant, 'delegate');
    assert.equal(classifyEisenhower(task({ priorityWeight: 1 }), { now }).quadrant, 'eliminate');
  });

  it('orders quadrants then deadlines', () => {
    const q1 = task({ id: 'q1', priorityWeight: 3, dueDate: hours(20) });
    const q1earlier = task({ id: 'q1e', priorityWeight: 3, dueDate: hours(2) });
    const q2 = task({ id: 'q2', priorityWeight: 4 });
    const q3 = task({ id: 'q3', priorityWeight: 1, dueDate: hours(1) });
    const q4 = task({ id: 'q4', priorityWeight: 1 });
    assert.deepEqual(eisenhower([q4, q3, q2, q1, q1earlier], { now }).map(r => r.task.id), ['q1e', 'q1', 'q2', 'q3', 'q4']);
  });
});
