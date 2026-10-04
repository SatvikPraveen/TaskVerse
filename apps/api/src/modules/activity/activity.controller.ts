// apps/api/src/modules/activity/activity.controller.ts
import type { Response } from 'express';
import type { FilterQuery } from 'mongoose';
import { z } from 'zod';

import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { Task } from '@/modules/tasks/task.model';
import { accessibleBy } from '@/modules/tasks/task.service';

import { Activity, type IActivity } from './activity.model';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const feedQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  /** Cursor: only entries older than this activity id. */
  before: objectId.optional(),
  event: z.string().max(50).optional(),
});

const POPULATE = { path: 'actor', select: 'username firstName lastName avatar' };

const page = async (filter: FilterQuery<IActivity>, limit: number, before?: string) => {
  if (before) filter._id = { $lt: before };
  const entries = await Activity.find(filter)
    .populate(POPULATE)
    .sort({ _id: -1 })
    .limit(limit + 1);
  const hasMore = entries.length > limit;
  const items = hasMore ? entries.slice(0, limit) : entries;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1]._id.toString() : null };
};

export class ActivityController {
  /** Everything that happened to work the user is involved in, newest first. */
  static feed = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const q = feedQuery.parse(req.query);
    const filter: FilterQuery<IActivity> = { audience: req.user!.id };
    if (q.event) filter.event = q.event;
    const result = await page(filter, q.limit, q.before);
    res.json({ success: true, data: { activity: result.items, hasMore: result.hasMore, nextCursor: result.nextCursor } });
  });

  /** History of a single task the user can see. */
  static forTask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { taskId } = z.object({ taskId: objectId }).parse(req.params);
    const q = feedQuery.parse(req.query);

    const visible = await Task.exists({ _id: taskId, ...accessibleBy(req.user!.id) });
    if (!visible) throw createError('Task not found', 404);

    const result = await page({ entityType: 'task', entityId: taskId }, q.limit, q.before);
    res.json({ success: true, data: { activity: result.items, hasMore: result.hasMore, nextCursor: result.nextCursor } });
  });
}
