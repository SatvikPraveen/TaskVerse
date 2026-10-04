// apps/api/src/modules/planning/planning.controller.ts
import {
  buildGraph,
  classifyEisenhower,
  criticalPath,
  type EisenhowerQuadrant,
  forecastCompletion,
  getPolicy,
  MS_PER_DAY,
  POLICY_NAMES,
  type PolicyName,
  readyTasks,
  simulate,
  throughputSeries,
  transitiveDependentCount,
} from '@taskverse/scheduler';
import type { Response } from 'express';
import { z } from 'zod';

import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/error';
import { loadPlanningTasks, toSchedulable } from '@/modules/tasks/task.service';

const policyEnum = z.enum(POLICY_NAMES as [PolicyName, ...PolicyName[]]);

const recommendationsQuery = z.object({
  policy: policyEnum.default('wsjf'),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  /** Include tasks that are blocked by unfinished prerequisites. */
  includeBlocked: z.coerce.boolean().default(false),
});

const forecastQuery = z.object({
  lookbackDays: z.coerce.number().int().min(7).max(365).default(60),
  bucket: z.enum(['day', 'week']).default('day'),
  trials: z.coerce.number().int().min(100).max(50_000).default(10_000),
  seed: z.coerce.number().int().default(42),
});

const simulateQuery = z.object({
  workers: z.coerce.number().int().min(1).max(50).default(1),
  policies: z
    .string()
    .optional()
    .transform(v => (v ? v.split(',').map(s => s.trim()).filter(Boolean) : [...POLICY_NAMES]))
    .pipe(z.array(policyEnum).min(1)),
});

export const POLICY_CATALOGUE: Record<PolicyName, { label: string; summary: string; reference: string }> = {
  fifo: {
    label: 'First-in, first-out',
    summary: 'Oldest task first. A baseline that ignores value and deadlines.',
    reference: 'Queueing baseline',
  },
  priority: {
    label: 'Static priority',
    summary: 'Highest priority first, ties by due date. Ignores effort.',
    reference: 'Common issue-tracker default',
  },
  spt: {
    label: 'Shortest processing time',
    summary: 'Smallest job first. Minimises mean flow time on one worker.',
    reference: 'Smith (1956)',
  },
  edf: {
    label: 'Earliest deadline first',
    summary: 'Soonest due date first. Optimal for meeting deadlines when feasible.',
    reference: 'Liu & Layland (1973)',
  },
  wsjf: {
    label: 'Weighted shortest job first',
    summary: 'Cost of delay (value + urgency + unblocking) divided by job size.',
    reference: 'Reinertsen (2009)',
  },
  eisenhower: {
    label: 'Eisenhower matrix',
    summary: 'Important × urgent quadrants: do first, schedule, delegate, eliminate.',
    reference: 'Covey (1989)',
  },
};

export class PlanningController {
  static listPolicies = asyncHandler<AuthRequest>(async (_req, res: Response) => {
    const policies = POLICY_NAMES.map(name => ({ name, ...POLICY_CATALOGUE[name] }));
    res.json({ success: true, data: { policies } });
  });

  static recommendations = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const q = recommendationsQuery.parse(req.query);
    const now = new Date();

    const all = (await loadPlanningTasks(req.user!.id)).map(toSchedulable);
    const graph = buildGraph(all);
    const ready = readyTasks(graph);
    const readyIds = new Set(ready.map(t => t.id));
    const open = all.filter(t => t.status === 'todo' || t.status === 'in_progress');
    const candidates = q.includeBlocked ? open : ready;

    const dependentCounts = new Map(all.map(t => [t.id, transitiveDependentCount(graph, t.id)]));
    const ranked = getPolicy(q.policy)(candidates, { now, dependentCounts });

    const recommendations = ranked.slice(0, q.limit).map(entry => ({
      rank: entry.rank,
      taskId: entry.task.id,
      title: entry.task.title,
      status: entry.task.status,
      priorityWeight: entry.task.priorityWeight,
      dueDate: entry.task.dueDate?.toISOString() ?? null,
      estimatedHours: entry.task.estimatedHours ?? null,
      score: Number.isFinite(entry.score) ? Number(entry.score.toFixed(4)) : null,
      rationale: entry.rationale,
      components: entry.components,
      isBlocked: !readyIds.has(entry.task.id),
      unblocks: dependentCounts.get(entry.task.id) ?? 0,
    }));

    res.json({
      success: true,
      data: {
        policy: q.policy,
        generatedAt: now.toISOString(),
        totals: { open: open.length, ready: ready.length, blocked: open.length - ready.length },
        recommendations,
      },
    });
  });

  static criticalPath = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const all = (await loadPlanningTasks(req.user!.id)).map(toSchedulable);
    const titles = new Map(all.map(t => [t.id, t.title ?? t.id]));
    const result = criticalPath(all);

    const nodes = [...result.nodes.values()]
      .filter(n => n.duration > 0)
      .map(n => ({
        taskId: n.id,
        title: titles.get(n.id),
        durationHours: n.duration,
        earliestStart: n.earliestStart,
        earliestFinish: n.earliestFinish,
        latestStart: n.latestStart,
        latestFinish: n.latestFinish,
        slackHours: Number(n.slack.toFixed(2)),
        isCritical: n.isCritical,
      }))
      .sort((a, b) => a.earliestStart - b.earliestStart || a.slackHours - b.slackHours);

    res.json({
      success: true,
      data: {
        makespanHours: Number(result.makespan.toFixed(2)),
        criticalPath: result.criticalPath.map(id => ({ taskId: id, title: titles.get(id) })),
        cycle: result.cycle?.map(id => ({ taskId: id, title: titles.get(id) })) ?? null,
        nodes,
      },
    });
  });

  static eisenhower = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const now = new Date();
    const open = (await loadPlanningTasks(req.user!.id))
      .map(toSchedulable)
      .filter(t => t.status === 'todo' || t.status === 'in_progress');

    const quadrants: Record<EisenhowerQuadrant, Array<{ taskId: string; title?: string; dueDate: string | null; priorityWeight: number }>> = {
      do_first: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };
    for (const task of open) {
      const { quadrant } = classifyEisenhower(task, { now });
      quadrants[quadrant].push({
        taskId: task.id,
        title: task.title,
        dueDate: task.dueDate?.toISOString() ?? null,
        priorityWeight: task.priorityWeight,
      });
    }
    for (const list of Object.values(quadrants)) {
      list.sort((a, b) => (a.dueDate ?? '9').localeCompare(b.dueDate ?? '9') || b.priorityWeight - a.priorityWeight);
    }

    res.json({ success: true, data: { generatedAt: now.toISOString(), quadrants } });
  });

  static forecast = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const q = forecastQuery.parse(req.query);
    const now = new Date();
    const from = new Date(now.getTime() - q.lookbackDays * MS_PER_DAY);

    const all = (await loadPlanningTasks(req.user!.id, { since: from })).map(toSchedulable);
    const remaining = all.filter(t => t.status === 'todo' || t.status === 'in_progress').length;
    const series = throughputSeries(all, { from, to: now, bucket: q.bucket });
    const samples = series.map(p => p.completed);

    const result = forecastCompletion({ remainingItems: remaining, throughputSamples: samples, trials: q.trials, seed: q.seed });
    const periodMs = q.bucket === 'week' ? 7 * MS_PER_DAY : MS_PER_DAY;
    const toDate = (periods: number) => new Date(now.getTime() + periods * periodMs).toISOString();

    res.json({
      success: true,
      data: {
        generatedAt: now.toISOString(),
        remainingItems: remaining,
        lookback: { from: from.toISOString(), to: now.toISOString(), bucket: q.bucket, periods: samples.length },
        throughput: { samples, mean: samples.length ? Number((samples.reduce((a, b) => a + b, 0) / samples.length).toFixed(3)) : 0 },
        forecast: result
          ? {
              trials: result.trials,
              seed: q.seed,
              periods: result.percentiles,
              dates: {
                p50: toDate(result.percentiles.p50),
                p70: toDate(result.percentiles.p70),
                p85: toDate(result.percentiles.p85),
                p95: toDate(result.percentiles.p95),
              },
              meanPeriods: result.meanPeriods,
              histogram: result.histogram,
              truncatedShare: result.truncatedShare,
            }
          : null,
        note: result ? undefined : 'Not enough completed work in the lookback window to forecast.',
      },
    });
  });

  static simulate = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const q = simulateQuery.parse(req.query);
    const start = new Date();
    const all = (await loadPlanningTasks(req.user!.id)).map(toSchedulable);

    const runs = q.policies.map(policy => {
      const result = simulate(all, { policy, start, workers: q.workers });
      return { policy, ...POLICY_CATALOGUE[policy], metrics: result.metrics, unscheduled: result.unscheduled };
    });
    // Lowest weighted tardiness wins; makespan as the tie-break.
    runs.sort((a, b) => a.metrics.weightedTardiness - b.metrics.weightedTardiness || a.metrics.makespan - b.metrics.makespan);

    res.json({
      success: true,
      data: {
        generatedAt: start.toISOString(),
        workers: q.workers,
        pendingTasks: all.filter(t => t.status === 'todo' || t.status === 'in_progress').length,
        recommendedPolicy: runs[0]?.policy ?? null,
        runs,
      },
    });
  });
}
