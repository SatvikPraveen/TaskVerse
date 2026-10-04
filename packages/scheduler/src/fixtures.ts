// packages/scheduler/src/fixtures.ts
import { createRng } from './random';
import { MS_PER_HOUR, type SchedulableStatus, type SchedulableTask } from './types';

export interface WorkloadOptions {
  size: number;
  seed?: number;
  /** Simulation origin; all timestamps are relative to it. Default 2026-01-05T09:00Z. */
  now?: Date;
  /** Probability a task carries a due date. Default 0.7. */
  dueDateRate?: number;
  /** Probability a task has an estimate. Default 0.8. */
  estimateRate?: number;
  /** Mean number of prerequisites per task (edges are only added backwards, so the graph is acyclic). Default 0.6. */
  meanDependencies?: number;
  /** Share of tasks already completed, with realistic start/finish timestamps. Default 0. */
  completedShare?: number;
  /** Deadline tightness: due dates are drawn from [1, horizonHours]. Default 240 (10 days). */
  horizonHours?: number;
}

/**
 * Generates a synthetic but structurally realistic workload: log-normal-ish
 * estimates, priority skewed towards medium, deadlines spread over a horizon
 * with a slice already overdue, and a sparse acyclic dependency graph.
 */
export const generateWorkload = (options: WorkloadOptions): SchedulableTask[] => {
  const rng = createRng(options.seed ?? 1);
  const now = options.now ?? new Date('2026-01-05T09:00:00.000Z');
  const dueDateRate = options.dueDateRate ?? 0.7;
  const estimateRate = options.estimateRate ?? 0.8;
  const meanDependencies = options.meanDependencies ?? 0.6;
  const completedShare = options.completedShare ?? 0;
  const horizon = options.horizonHours ?? 240;

  const priorities = [1, 2, 2, 2, 3, 3, 4]; // skewed towards medium
  const tasks: SchedulableTask[] = [];

  for (let i = 0; i < options.size; i += 1) {
    const id = `t${String(i + 1).padStart(4, '0')}`;
    const ageHours = rng.next() * 24 * 30; // created within the last 30 days
    const createdAt = new Date(now.getTime() - ageHours * MS_PER_HOUR);
    const estimate =
      rng.next() < estimateRate ? Math.round((0.5 + Math.exp(rng.next() * 2.2)) * 2) / 2 : null;
    const hasDue = rng.next() < dueDateRate;
    // 15% of dated tasks are already overdue.
    const dueOffset = hasDue ? (rng.next() < 0.15 ? -rng.next() * 72 : 1 + rng.next() * horizon) : null;
    const dueDate = dueOffset === null ? null : new Date(now.getTime() + dueOffset * MS_PER_HOUR);

    const dependencies: string[] = [];
    if (i > 0) {
      let edges = 0;
      // Poisson-ish count via repeated Bernoulli draws.
      while (rng.next() < meanDependencies / (edges + 1) && edges < 3) edges += 1;
      for (let e = 0; e < edges; e += 1) {
        const dep = `t${String(rng.int(i) + 1).padStart(4, '0')}`;
        if (!dependencies.includes(dep)) dependencies.push(dep);
      }
    }

    let status: SchedulableStatus = 'todo';
    let startedAt: Date | null = null;
    let completedAt: Date | null = null;
    if (rng.next() < completedShare) {
      status = 'completed';
      const startDelay = rng.next() * Math.min(ageHours, 48);
      startedAt = new Date(createdAt.getTime() + startDelay * MS_PER_HOUR);
      const work = (estimate ?? 2) * (0.5 + rng.next() * 2);
      completedAt = new Date(Math.min(now.getTime(), startedAt.getTime() + work * MS_PER_HOUR));
    } else if (rng.next() < 0.2) {
      status = 'in_progress';
      startedAt = new Date(createdAt.getTime() + rng.next() * Math.min(ageHours, 24) * MS_PER_HOUR);
    }

    tasks.push({
      id,
      title: `Task ${i + 1}`,
      priorityWeight: rng.pick(priorities),
      estimatedHours: estimate,
      dueDate,
      createdAt,
      startedAt,
      completedAt,
      status,
      dependencies,
    });
  }

  return tasks;
};
