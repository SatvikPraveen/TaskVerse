// packages/scheduler/src/simulate.ts
import { buildGraph, transitiveDependentCount } from './graph';
import { getPolicy, type Policy, type PolicyContext } from './policies';
import { mean, round } from './stats';
import { isTerminal, MS_PER_HOUR, type SchedulableTask } from './types';

export interface SimulationOptions {
  /** Prioritisation policy to evaluate. */
  policy: Policy | string;
  /** Wall-clock origin of the simulation. Default: now. */
  start?: Date;
  /** Number of tasks that can be worked on concurrently. Default 1. */
  workers?: number;
  /** Hours assumed for tasks without an estimate. Default 2. */
  defaultEstimateHours?: number;
  /** Extra policy context (horizons, thresholds). */
  context?: Partial<Omit<PolicyContext, 'now'>>;
}

export interface ScheduledTask {
  id: string;
  startHour: number;
  finishHour: number;
  worker: number;
  /** Hours late relative to the due date (0 when on time or undated). */
  tardiness: number;
  /** finish − due; negative means early. NaN when undated. */
  lateness: number;
  priorityWeight: number;
}

export interface SimulationMetrics {
  /** Time until the last task finishes, in hours. */
  makespan: number;
  meanFlowTime: number;
  totalTardiness: number;
  meanTardiness: number;
  /** Tardiness weighted by priority: the objective that matters to users. */
  weightedTardiness: number;
  maxLateness: number;
  lateTasks: number;
  onTimeRate: number;
  scheduledTasks: number;
}

export interface SimulationResult {
  policy: string;
  schedule: ScheduledTask[];
  metrics: SimulationMetrics;
  /** Tasks that could never start because of unresolved prerequisites (cycles). */
  unscheduled: string[];
}

/**
 * Discrete-event list scheduler. At every decision point the policy ranks
 * the ready set (prerequisites finished, not yet started) and the highest
 * ranked task is assigned to the first free worker. Non-preemptive.
 */
export const simulate = (
  tasks: readonly SchedulableTask[],
  options: SimulationOptions
): SimulationResult => {
  const policy = typeof options.policy === 'string' ? getPolicy(options.policy) : options.policy;
  const policyName = typeof options.policy === 'string' ? options.policy : policy.name || 'custom';
  const start = options.start ?? new Date();
  const workers = Math.max(1, Math.floor(options.workers ?? 1));
  const defaultEstimate = options.defaultEstimateHours ?? 2;

  const pending = tasks.filter(t => !isTerminal(t.status));
  const graph = buildGraph(tasks);
  const dependentCounts = new Map([...graph.nodes.keys()].map(id => [id, transitiveDependentCount(graph, id)]));
  const finished = new Set<string>(tasks.filter(t => isTerminal(t.status)).map(t => t.id));
  const started = new Set<string>();
  const workerFreeAt = new Array<number>(workers).fill(0);
  const schedule: ScheduledTask[] = [];

  const durationOf = (task: SchedulableTask) =>
    task.estimatedHours && task.estimatedHours > 0 ? task.estimatedHours : defaultEstimate;

  const ready = (): SchedulableTask[] =>
    pending.filter(task => {
      if (started.has(task.id)) return false;
      for (const dep of graph.prerequisites.get(task.id) ?? []) if (!finished.has(dep)) return false;
      return true;
    });

  // Events: a worker becoming free. Min-heap would be ideal; sizes are small.
  const running: Array<{ id: string; finishHour: number }> = [];

  let guard = 0;
  while (started.size < pending.length && guard < pending.length * 4 + 10) {
    guard += 1;
    const freeWorker = workerFreeAt.findIndex(t => t <= Math.min(...workerFreeAt));
    const now = workerFreeAt[freeWorker];
    const nowDate = new Date(start.getTime() + now * MS_PER_HOUR);

    const candidates = ready();
    if (candidates.length === 0) {
      // Nothing is ready: advance to the next running completion, if any.
      const nextFinish = running
        .filter(r => !finished.has(r.id))
        .sort((a, b) => a.finishHour - b.finishHour)[0];
      if (!nextFinish) break; // deadlock: remaining tasks are stuck behind a cycle
      finished.add(nextFinish.id);
      workerFreeAt[freeWorker] = Math.max(now, nextFinish.finishHour);
      continue;
    }

    const [top] = policy(candidates, {
      now: nowDate,
      defaultEstimateHours: defaultEstimate,
      dependentCounts,
      ...options.context,
    });
    const task = top.task;
    const duration = durationOf(task);
    const finishHour = now + duration;
    started.add(task.id);
    running.push({ id: task.id, finishHour });
    workerFreeAt[freeWorker] = finishHour;

    const dueHour = task.dueDate ? (task.dueDate.getTime() - start.getTime()) / MS_PER_HOUR : Number.NaN;
    const lateness = Number.isNaN(dueHour) ? Number.NaN : finishHour - dueHour;
    schedule.push({
      id: task.id,
      startHour: now,
      finishHour,
      worker: freeWorker,
      tardiness: Number.isNaN(lateness) ? 0 : Math.max(0, lateness),
      lateness,
      priorityWeight: task.priorityWeight,
    });

    // Mark any running tasks that finish before the next decision as done.
    const nextFree = Math.min(...workerFreeAt);
    for (const r of running) if (r.finishHour <= nextFree) finished.add(r.id);
  }

  const unscheduled = pending.filter(t => !started.has(t.id)).map(t => t.id);
  const dated = schedule.filter(s => !Number.isNaN(s.lateness));
  const metrics: SimulationMetrics = {
    makespan: round(schedule.reduce((m, s) => Math.max(m, s.finishHour), 0)),
    meanFlowTime: round(schedule.length ? mean(schedule.map(s => s.finishHour)) : 0),
    totalTardiness: round(dated.reduce((sum, s) => sum + s.tardiness, 0)),
    meanTardiness: round(dated.length ? mean(dated.map(s => s.tardiness)) : 0),
    weightedTardiness: round(dated.reduce((sum, s) => sum + s.tardiness * s.priorityWeight, 0)),
    maxLateness: round(dated.length ? Math.max(...dated.map(s => s.lateness)) : 0),
    lateTasks: dated.filter(s => s.tardiness > 0).length,
    onTimeRate: round(dated.length ? dated.filter(s => s.tardiness === 0).length / dated.length : 1, 4),
    scheduledTasks: schedule.length,
  };

  return { policy: policyName, schedule, metrics, unscheduled };
};
