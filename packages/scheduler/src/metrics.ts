// packages/scheduler/src/metrics.ts
import { type DistributionSummary, round, summarize } from './stats';
import { hoursBetween, MS_PER_DAY, type SchedulableStatus, type SchedulableTask } from './types';

export type Bucket = 'day' | 'week';

export interface PeriodWindow {
  from: Date;
  to: Date;
  bucket?: Bucket;
}

const startOfDayUtc = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/** ISO weeks start on Monday. */
const startOfWeekUtc = (d: Date): Date => {
  const day = startOfDayUtc(d);
  const offset = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - offset * MS_PER_DAY);
};

const bucketStart = (d: Date, bucket: Bucket): Date =>
  bucket === 'week' ? startOfWeekUtc(d) : startOfDayUtc(d);

const bucketLength = (bucket: Bucket): number => (bucket === 'week' ? 7 * MS_PER_DAY : MS_PER_DAY);

export const periodsBetween = (window: PeriodWindow): Date[] => {
  const bucket = window.bucket ?? 'day';
  const periods: Date[] = [];
  const end = window.to.getTime();
  for (let cursor = bucketStart(window.from, bucket); cursor.getTime() <= end;) {
    periods.push(cursor);
    cursor = new Date(cursor.getTime() + bucketLength(bucket));
  }
  return periods;
};

/** Hours from first start to completion. Only tasks with both timestamps count. */
export const cycleTimesHours = (tasks: readonly SchedulableTask[]): number[] =>
  tasks
    .filter(t => t.status === 'completed' && t.startedAt && t.completedAt)
    .map(t => hoursBetween(t.startedAt!, t.completedAt!))
    .filter(h => h >= 0);

/** Hours from creation to completion. */
export const leadTimesHours = (tasks: readonly SchedulableTask[]): number[] =>
  tasks
    .filter(t => t.status === 'completed' && t.completedAt)
    .map(t => hoursBetween(t.createdAt, t.completedAt!))
    .filter(h => h >= 0);

export interface ThroughputPoint {
  period: string;
  created: number;
  completed: number;
}

/** Items created and completed per bucket over the window. */
export const throughputSeries = (
  tasks: readonly SchedulableTask[],
  window: PeriodWindow
): ThroughputPoint[] => {
  const bucket = window.bucket ?? 'day';
  const periods = periodsBetween(window);
  const index = new Map(periods.map((p, i) => [p.getTime(), i]));
  const points = periods.map(p => ({ period: p.toISOString().slice(0, 10), created: 0, completed: 0 }));

  const slot = (d: Date) => index.get(bucketStart(d, bucket).getTime());
  for (const task of tasks) {
    const c = slot(task.createdAt);
    if (c !== undefined) points[c].created += 1;
    if (task.status === 'completed' && task.completedAt) {
      const f = slot(task.completedAt);
      if (f !== undefined) points[f].completed += 1;
    }
  }
  return points;
};

export interface CumulativeFlowPoint {
  period: string;
  todo: number;
  in_progress: number;
  completed: number;
}

type FlowState = Exclude<SchedulableStatus, 'cancelled'>;

const statusAt = (task: SchedulableTask, at: Date): FlowState | null => {
  if (task.createdAt > at) return null;
  if (task.status === 'cancelled') return null; // cancelled work is excluded from flow
  if (task.completedAt && task.completedAt <= at) return 'completed';
  if (task.startedAt && task.startedAt <= at) return 'in_progress';
  if (task.status === 'in_progress' && !task.startedAt) return 'in_progress';
  return 'todo';
};

/**
 * Cumulative flow diagram: how many items sat in each state at the end of
 * every bucket, reconstructed from creation/start/completion timestamps.
 */
export const cumulativeFlow = (
  tasks: readonly SchedulableTask[],
  window: PeriodWindow
): CumulativeFlowPoint[] => {
  const bucket = window.bucket ?? 'day';
  return periodsBetween(window).map(start => {
    const end = new Date(start.getTime() + bucketLength(bucket) - 1);
    const point: CumulativeFlowPoint = {
      period: start.toISOString().slice(0, 10),
      todo: 0,
      in_progress: 0,
      completed: 0,
    };
    for (const task of tasks) {
      const status = statusAt(task, end);
      if (status) point[status] += 1;
    }
    return point;
  });
};

export interface AgingItem {
  id: string;
  title?: string;
  status: SchedulableStatus;
  ageHours: number;
  /** Hours since first start when known, else since creation. */
  inProgressHours: number | null;
}

/** Work-in-progress ordered by age, the Kanban "aging WIP" view. */
export const agingWip = (tasks: readonly SchedulableTask[], now: Date): AgingItem[] =>
  tasks
    .filter(t => t.status === 'todo' || t.status === 'in_progress')
    .map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      ageHours: round(hoursBetween(t.createdAt, now), 1),
      inProgressHours: t.startedAt ? round(hoursBetween(t.startedAt, now), 1) : null,
    }))
    .sort((a, b) => b.ageHours - a.ageHours);

export interface FlowSummary {
  window: { from: string; to: string; days: number };
  wip: number;
  completed: number;
  /** Items per day over the window. */
  throughputPerDay: number;
  cycleTimeHours: DistributionSummary;
  leadTimeHours: DistributionSummary;
  /** Little's Law: expected lead time (days) = WIP / throughput. */
  littlesLawLeadTimeDays: number | null;
  /** Share of completed tasks with a due date that finished on or before it. */
  onTimeRate: number | null;
}

/** Headline flow metrics for a window (Little, 1961; Vacanti, 2015). */
export const flowSummary = (tasks: readonly SchedulableTask[], window: PeriodWindow): FlowSummary => {
  const days = Math.max(1, (window.to.getTime() - window.from.getTime()) / MS_PER_DAY);
  const completedInWindow = tasks.filter(
    t =>
      t.status === 'completed' && t.completedAt && t.completedAt >= window.from && t.completedAt <= window.to
  );
  const wip = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
  const throughputPerDay = completedInWindow.length / days;
  const dated = completedInWindow.filter(t => t.dueDate);
  const onTime = dated.filter(t => t.completedAt! <= t.dueDate!).length;

  const roundSummary = (s: DistributionSummary): DistributionSummary => ({
    n: s.n,
    mean: round(s.mean),
    stddev: round(s.stddev),
    min: round(s.min),
    p50: round(s.p50),
    p85: round(s.p85),
    p95: round(s.p95),
    max: round(s.max),
  });

  return {
    window: { from: window.from.toISOString(), to: window.to.toISOString(), days: round(days, 1) },
    wip,
    completed: completedInWindow.length,
    throughputPerDay: round(throughputPerDay, 3),
    cycleTimeHours: roundSummary(summarize(cycleTimesHours(completedInWindow))),
    leadTimeHours: roundSummary(summarize(leadTimesHours(completedInWindow))),
    littlesLawLeadTimeDays: throughputPerDay > 0 ? round(wip / throughputPerDay, 1) : null,
    onTimeRate: dated.length ? round(onTime / dated.length, 4) : null,
  };
};
