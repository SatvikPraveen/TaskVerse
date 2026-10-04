import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  agingWip,
  cumulativeFlow,
  cycleTimesHours,
  flowSummary,
  leadTimesHours,
  periodsBetween,
  throughputSeries,
} from './metrics';
import { percentile, summarize } from './stats';
import { MS_PER_HOUR, type SchedulableTask } from './types';

const t0 = new Date('2026-01-05T00:00:00.000Z'); // a Monday
const h = (hours: number) => new Date(t0.getTime() + hours * MS_PER_HOUR);

const task = (id: string, extra: Partial<SchedulableTask>): SchedulableTask => ({
  id,
  priorityWeight: 2,
  createdAt: t0,
  status: 'todo',
  ...extra,
});

describe('percentile', () => {
  it('interpolates linearly (type 7)', () => {
    assert.equal(percentile([1, 2, 3, 4], 50), 2.5);
    assert.equal(percentile([1, 2, 3, 4], 0), 1);
    assert.equal(percentile([1, 2, 3, 4], 100), 4);
    assert.equal(percentile([10], 85), 10);
    assert.ok(Number.isNaN(percentile([], 50)));
  });

  it('summarises a sample', () => {
    const s = summarize([2, 4, 4, 4, 5, 5, 7, 9]);
    assert.equal(s.n, 8);
    assert.equal(s.mean, 5);
    assert.equal(s.min, 2);
    assert.equal(s.max, 9);
    assert.equal(s.p50, 4.5);
  });
});

describe('cycle and lead times', () => {
  const done = task('a', { status: 'completed', createdAt: h(0), startedAt: h(4), completedAt: h(10) });
  const open = task('b', { status: 'in_progress', startedAt: h(1) });

  it('measure start→done and created→done in hours', () => {
    assert.deepEqual(cycleTimesHours([done, open]), [6]);
    assert.deepEqual(leadTimesHours([done, open]), [10]);
  });
});

describe('periodsBetween', () => {
  it('yields each day and aligns weeks to Monday', () => {
    const days = periodsBetween({ from: h(5), to: h(24 * 2 + 1), bucket: 'day' });
    assert.deepEqual(
      days.map(d => d.toISOString().slice(0, 10)),
      ['2026-01-05', '2026-01-06', '2026-01-07']
    );
    const weeks = periodsBetween({ from: h(24 * 3), to: h(24 * 10), bucket: 'week' });
    assert.deepEqual(
      weeks.map(d => d.toISOString().slice(0, 10)),
      ['2026-01-05', '2026-01-12']
    );
  });
});

describe('throughputSeries', () => {
  it('counts creations and completions per day', () => {
    const tasks = [
      task('a', { createdAt: h(1), status: 'completed', completedAt: h(30) }),
      task('b', { createdAt: h(2) }),
      task('c', { createdAt: h(26), status: 'completed', completedAt: h(27) }),
    ];
    const series = throughputSeries(tasks, { from: h(0), to: h(47) });
    assert.deepEqual(series, [
      { period: '2026-01-05', created: 2, completed: 0 },
      { period: '2026-01-06', created: 1, completed: 2 },
    ]);
  });
});

describe('cumulativeFlow', () => {
  it('reconstructs state counts at the end of each day', () => {
    const tasks = [
      task('a', { createdAt: h(1), status: 'completed', startedAt: h(20), completedAt: h(40) }),
      task('b', { createdAt: h(30) }),
      task('x', { createdAt: h(0), status: 'cancelled' }),
    ];
    const cfd = cumulativeFlow(tasks, { from: h(0), to: h(60) });
    assert.deepEqual(cfd, [
      { period: '2026-01-05', todo: 0, in_progress: 1, completed: 0 },
      { period: '2026-01-06', todo: 1, in_progress: 0, completed: 1 },
      { period: '2026-01-07', todo: 1, in_progress: 0, completed: 1 },
    ]);
  });
});

describe('agingWip', () => {
  it('lists open work oldest first with in-progress age', () => {
    const items = agingWip(
      [
        task('old', { createdAt: h(-48), status: 'in_progress', startedAt: h(-24) }),
        task('new', { createdAt: h(-1) }),
        task('done', { status: 'completed' }),
      ],
      h(0)
    );
    assert.deepEqual(
      items.map(i => i.id),
      ['old', 'new']
    );
    assert.equal(items[0].inProgressHours, 24);
    assert.equal(items[1].inProgressHours, null);
  });
});

describe('flowSummary', () => {
  it('derives throughput, Little’s Law and on-time rate', () => {
    const tasks = [
      task('a', {
        createdAt: h(0),
        status: 'completed',
        startedAt: h(2),
        completedAt: h(12),
        dueDate: h(24),
      }),
      task('b', {
        createdAt: h(0),
        status: 'completed',
        startedAt: h(2),
        completedAt: h(30),
        dueDate: h(24),
      }),
      task('c', { createdAt: h(0) }),
      task('d', { createdAt: h(0), status: 'in_progress', startedAt: h(1) }),
    ];
    const summary = flowSummary(tasks, { from: h(0), to: h(48) });
    assert.equal(summary.completed, 2);
    assert.equal(summary.wip, 2);
    assert.equal(summary.throughputPerDay, 1);
    assert.equal(summary.littlesLawLeadTimeDays, 2);
    assert.equal(summary.onTimeRate, 0.5);
    assert.equal(summary.cycleTimeHours.n, 2);
    assert.equal(summary.cycleTimeHours.p50, 19);
  });
});
