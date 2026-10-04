// packages/scheduler/src/policies.ts
import { buildGraph, transitiveDependentCount } from './graph';
import { round } from './stats';
import { clamp, hoursBetween, type SchedulableTask } from './types';

export type PolicyName = 'fifo' | 'priority' | 'spt' | 'edf' | 'wsjf' | 'eisenhower';

export const POLICY_NAMES: readonly PolicyName[] = [
  'fifo',
  'priority',
  'spt',
  'edf',
  'wsjf',
  'eisenhower',
] as const;

export interface PolicyContext {
  now: Date;
  /** Hours assumed for tasks without an estimate. Default 2. */
  defaultEstimateHours?: number;
  /** WSJF: horizon over which time criticality ramps from 0 to max. Default 168h (7 days). */
  criticalityHorizonHours?: number;
  /** Eisenhower: "urgent" means due within this many hours. Default 48. */
  urgentHorizonHours?: number;
  /** Eisenhower: priorities at or above this weight are "important". Default 3 (high). */
  importantThreshold?: number;
  /** Pre-computed transitive dependent counts (lets callers reuse a graph). */
  dependentCounts?: Map<string, number>;
}

export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate';

export interface RankedTask {
  task: SchedulableTask;
  rank: number;
  /** Higher is scheduled earlier. Comparable only within one policy. */
  score: number;
  /** Human-readable justification suitable for showing in a UI. */
  rationale: string;
  /** Policy-specific breakdown of the score. */
  components: Record<string, number | string>;
}

export type Policy = (tasks: readonly SchedulableTask[], ctx: PolicyContext) => RankedTask[];

const jobSize = (task: SchedulableTask, ctx: PolicyContext): number => {
  const estimate = task.estimatedHours;
  const hours =
    estimate !== undefined && estimate !== null && estimate > 0 ? estimate : (ctx.defaultEstimateHours ?? 2);
  return Math.max(0.25, hours);
};

const hoursUntilDue = (task: SchedulableTask, now: Date): number | null =>
  task.dueDate ? hoursBetween(now, task.dueDate) : null;

const finalize = (
  scored: Array<Omit<RankedTask, 'rank'>>,
  tieBreak: (a: SchedulableTask, b: SchedulableTask) => number
): RankedTask[] =>
  scored
    .sort((a, b) => b.score - a.score || tieBreak(a.task, b.task) || a.task.id.localeCompare(b.task.id))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));

const byCreated = (a: SchedulableTask, b: SchedulableTask) => a.createdAt.getTime() - b.createdAt.getTime();
const byPriorityDesc = (a: SchedulableTask, b: SchedulableTask) => b.priorityWeight - a.priorityWeight;
const byDue = (a: SchedulableTask, b: SchedulableTask) =>
  (a.dueDate?.getTime() ?? Number.POSITIVE_INFINITY) - (b.dueDate?.getTime() ?? Number.POSITIVE_INFINITY);

/** First-In-First-Out baseline: oldest task first. */
export const fifo: Policy = tasks =>
  finalize(
    tasks.map(task => ({
      task,
      score: -task.createdAt.getTime(),
      rationale: 'Oldest task first',
      components: { createdAt: task.createdAt.toISOString() },
    })),
    byPriorityDesc
  );

/** Static priority only; ties broken by due date then age. */
export const priority: Policy = tasks =>
  finalize(
    tasks.map(task => ({
      task,
      score: task.priorityWeight,
      rationale: `Priority weight ${task.priorityWeight}`,
      components: { priorityWeight: task.priorityWeight },
    })),
    (a, b) => byDue(a, b) || byCreated(a, b)
  );

/** Shortest Processing Time: minimises mean flow time on one machine (Smith, 1956). */
export const spt: Policy = (tasks, ctx) =>
  finalize(
    tasks.map(task => {
      const size = jobSize(task, ctx);
      return {
        task,
        score: -size,
        rationale: `Job size ${round(size)}h`,
        components: { jobSizeHours: round(size) },
      };
    }),
    (a, b) => byPriorityDesc(a, b) || byDue(a, b)
  );

/**
 * Earliest Deadline First (Liu & Layland, 1973). Optimal for meeting
 * deadlines on a single processor when the task set is feasible.
 */
export const edf: Policy = (tasks, ctx) =>
  finalize(
    tasks.map(task => {
      const hours = hoursUntilDue(task, ctx.now);
      return {
        task,
        score: hours === null ? Number.NEGATIVE_INFINITY : -hours,
        rationale:
          hours === null
            ? 'No deadline'
            : hours < 0
              ? `Overdue by ${round(-hours, 1)}h`
              : `Due in ${round(hours, 1)}h`,
        components: { hoursUntilDue: hours === null ? 'none' : round(hours, 1) },
      };
    }),
    (a, b) => byPriorityDesc(a, b) || byCreated(a, b)
  );

/**
 * Weighted Shortest Job First (Reinertsen, 2009; SAFe).
 *   cost of delay = business value + time criticality + risk/opportunity
 *   WSJF         = cost of delay / job size
 * Business value is the priority weight; time criticality ramps linearly to
 * its maximum as the deadline approaches and saturates once overdue; risk
 * reduction counts how many other tasks this one unblocks.
 */
export const wsjf: Policy = (tasks, ctx) => {
  const horizon = ctx.criticalityHorizonHours ?? 168;
  const dependentCounts =
    ctx.dependentCounts ??
    (() => {
      const graph = buildGraph(tasks);
      return new Map([...graph.nodes.keys()].map(id => [id, transitiveDependentCount(graph, id)]));
    })();

  return finalize(
    tasks.map(task => {
      const businessValue = task.priorityWeight;
      const hours = hoursUntilDue(task, ctx.now);
      let timeCriticality = 0;
      if (hours !== null) {
        timeCriticality =
          hours < 0 ? 4 + clamp(-hours / horizon, 0, 1) : 4 * clamp(1 - hours / horizon, 0, 1);
      }
      const riskReduction = clamp(dependentCounts.get(task.id) ?? 0, 0, 4);
      const costOfDelay = businessValue + timeCriticality + riskReduction;
      const size = jobSize(task, ctx);
      const score = costOfDelay / size;
      return {
        task,
        score,
        rationale: `CoD ${round(costOfDelay, 1)} (value ${businessValue}, urgency ${round(timeCriticality, 1)}, unblocks ${riskReduction}) ÷ ${round(size, 1)}h`,
        components: {
          businessValue,
          timeCriticality: round(timeCriticality, 2),
          riskReduction,
          costOfDelay: round(costOfDelay, 2),
          jobSizeHours: round(size, 2),
          wsjf: round(score, 3),
        },
      };
    }),
    (a, b) => byDue(a, b) || byCreated(a, b)
  );
};

export const classifyEisenhower = (
  task: SchedulableTask,
  ctx: PolicyContext
): { quadrant: EisenhowerQuadrant; important: boolean; urgent: boolean } => {
  const important = task.priorityWeight >= (ctx.importantThreshold ?? 3);
  const hours = hoursUntilDue(task, ctx.now);
  const urgent = hours !== null && hours <= (ctx.urgentHorizonHours ?? 48);
  const quadrant: EisenhowerQuadrant =
    important && urgent ? 'do_first' : important ? 'schedule' : urgent ? 'delegate' : 'eliminate';
  return { quadrant, important, urgent };
};

const QUADRANT_SCORE: Record<EisenhowerQuadrant, number> = {
  do_first: 4,
  schedule: 3,
  delegate: 2,
  eliminate: 1,
};

/**
 * Eisenhower matrix (Covey, 1989): importance × urgency quadrants, ordered
 * do-first → schedule → delegate → eliminate, then by deadline within a quadrant.
 */
export const eisenhower: Policy = (tasks, ctx) =>
  finalize(
    tasks.map(task => {
      const { quadrant, important, urgent } = classifyEisenhower(task, ctx);
      return {
        task,
        score: QUADRANT_SCORE[quadrant],
        rationale: `${important ? 'Important' : 'Not important'}, ${urgent ? 'urgent' : 'not urgent'} → ${quadrant.replace('_', ' ')}`,
        components: { quadrant, important: String(important), urgent: String(urgent) },
      };
    }),
    (a, b) => byDue(a, b) || byPriorityDesc(a, b) || byCreated(a, b)
  );

export const POLICIES: Record<PolicyName, Policy> = { fifo, priority, spt, edf, wsjf, eisenhower };

export const getPolicy = (name: string): Policy => {
  const policy = POLICIES[name as PolicyName];
  if (!policy) throw new RangeError(`Unknown policy "${name}". Known: ${POLICY_NAMES.join(', ')}`);
  return policy;
};
