// apps/api/src/modules/analytics/analytics.controller.ts
import { agingWip, cumulativeFlow, flowSummary, MS_PER_DAY, throughputSeries } from '@taskverse/scheduler';
import type { Response } from 'express';
import { z } from 'zod';

import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler } from '@/middleware/error';
import { loadPlanningTasks, toSchedulable } from '@/modules/tasks/task.service';

const windowQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  bucket: z.enum(['day', 'week']).default('day'),
});

const resolveWindow = (days: number) => {
  const to = new Date();
  const from = new Date(to.getTime() - days * MS_PER_DAY);
  return { from, to };
};

export class AnalyticsController {
  static flow = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { days } = windowQuery.parse(req.query);
    const { from, to } = resolveWindow(days);
    const tasks = (await loadPlanningTasks(req.user!.id, { since: from })).map(toSchedulable);
    res.json({ success: true, data: flowSummary(tasks, { from, to }) });
  });

  static throughput = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { days, bucket } = windowQuery.parse(req.query);
    const { from, to } = resolveWindow(days);
    const tasks = (await loadPlanningTasks(req.user!.id, { since: from })).map(toSchedulable);
    res.json({
      success: true,
      data: { from: from.toISOString(), to: to.toISOString(), bucket, series: throughputSeries(tasks, { from, to, bucket }) },
    });
  });

  static cumulativeFlow = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { days, bucket } = windowQuery.parse(req.query);
    const { from, to } = resolveWindow(days);
    // The CFD needs every task that existed in the window, including ones created earlier.
    const tasks = (await loadPlanningTasks(req.user!.id, { includeArchived: true })).map(toSchedulable);
    res.json({
      success: true,
      data: { from: from.toISOString(), to: to.toISOString(), bucket, series: cumulativeFlow(tasks, { from, to, bucket }) },
    });
  });

  static aging = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const now = new Date();
    const tasks = (await loadPlanningTasks(req.user!.id)).map(toSchedulable);
    res.json({ success: true, data: { generatedAt: now.toISOString(), items: agingWip(tasks, now) } });
  });
}
