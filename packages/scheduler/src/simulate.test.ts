import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { generateWorkload } from './fixtures';
import { POLICY_NAMES } from './policies';
import { simulate } from './simulate';
import { MS_PER_HOUR, type SchedulableTask } from './types';

const start = new Date('2026-01-05T09:00:00.000Z');
const hours = (h: number) => new Date(start.getTime() + h * MS_PER_HOUR);

const task = (id: string, estimatedHours: number, extra: Partial<SchedulableTask> = {}): SchedulableTask => ({
  id,
  priorityWeight: 2,
  estimatedHours,
  createdAt: hours(-1),
  status: 'todo',
  ...extra,
});

describe('simulate', () => {
  it('runs tasks back to back on a single worker', () => {
    const result = simulate([task('a', 2), task('b', 3)], { policy: 'fifo', start });
    assert.equal(result.metrics.makespan, 5);
    assert.equal(result.metrics.scheduledTasks, 2);
    assert.deepEqual(result.unscheduled, []);
    const [first, second] = result.schedule;
    assert.equal(first.finishHour, second.startHour);
  });

  it('uses additional workers in parallel', () => {
    const result = simulate([task('a', 4), task('b', 4)], { policy: 'fifo', start, workers: 2 });
    assert.equal(result.metrics.makespan, 4);
  });

  it('never starts a task before its prerequisites finish', () => {
    const result = simulate([task('b', 1, { dependencies: ['a'] }), task('a', 3)], {
      policy: 'spt', // would pick b first if dependencies were ignored
      start,
      workers: 2,
    });
    const a = result.schedule.find(s => s.id === 'a')!;
    const b = result.schedule.find(s => s.id === 'b')!;
    assert.ok(b.startHour >= a.finishHour);
  });

  it('computes tardiness against due dates', () => {
    const result = simulate([task('a', 5, { dueDate: hours(2) }), task('b', 1, { dueDate: hours(10) })], {
      policy: 'fifo',
      start,
    });
    const a = result.schedule.find(s => s.id === 'a')!;
    assert.equal(a.tardiness, 3);
    assert.equal(result.metrics.lateTasks, 1);
    assert.equal(result.metrics.onTimeRate, 0.5);
    assert.equal(result.metrics.weightedTardiness, 6);
  });

  it('EDF beats FIFO on tardiness when deadlines conflict with arrival order', () => {
    const tasks = [
      task('old', 4, { dueDate: hours(20), createdAt: hours(-10) }),
      task('new', 1, { dueDate: hours(1), createdAt: hours(-1) }),
    ];
    const fifoRun = simulate(tasks, { policy: 'fifo', start });
    const edfRun = simulate(tasks, { policy: 'edf', start });
    assert.ok(edfRun.metrics.totalTardiness < fifoRun.metrics.totalTardiness);
  });

  it('leaves tasks stuck in a cycle unscheduled instead of looping forever', () => {
    const result = simulate(
      [task('a', 1, { dependencies: ['b'] }), task('b', 1, { dependencies: ['a'] }), task('c', 1)],
      {
        policy: 'fifo',
        start,
      }
    );
    assert.deepEqual(result.unscheduled.sort(), ['a', 'b']);
    assert.equal(result.metrics.scheduledTasks, 1);
  });

  it('schedules every task of a generated workload under every policy', () => {
    const tasks = generateWorkload({ size: 120, seed: 7, now: start });
    const pending = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
    for (const policy of POLICY_NAMES) {
      const result = simulate(tasks, { policy, start, workers: 3 });
      assert.equal(result.metrics.scheduledTasks, pending, `${policy} scheduled all`);
      assert.deepEqual(result.unscheduled, []);
    }
  });

  it('is deterministic', () => {
    const tasks = generateWorkload({ size: 50, seed: 3, now: start });
    const a = simulate(tasks, { policy: 'wsjf', start });
    const b = simulate(tasks, { policy: 'wsjf', start });
    assert.deepEqual(a, b);
  });
});
