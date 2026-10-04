// apps/api/src/modules/tasks/task.service.ts
import mongoose, { type FilterQuery } from 'mongoose';

import { createError } from '@/middleware/error';
import { buildGraph, type SchedulableTask, wouldCreateCycle } from '@taskverse/scheduler';

import { type ITask, Task, type TaskStatus } from './task.model';

/** Tasks a user may read: ones they created or are assigned to. */
export const accessibleBy = (userId: string): FilterQuery<ITask> => ({
  $or: [{ createdBy: userId }, { assignedTo: userId }],
});

/** Lean projection sufficient for every planning and analytics routine. */
export interface PlanningTask {
  _id: mongoose.Types.ObjectId;
  title: string;
  status: TaskStatus;
  priorityWeight: number;
  estimatedHours?: number;
  dueDate?: Date;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  dependencies: mongoose.Types.ObjectId[];
}

export const PLANNING_PROJECTION =
  'title status priorityWeight estimatedHours dueDate createdAt startedAt completedAt dependencies';

/** Adapts a Mongoose task (document or lean) to the scheduler's input shape. */
export const toSchedulable = (task: PlanningTask | ITask): SchedulableTask => ({
  id: task._id.toString(),
  title: task.title,
  priorityWeight: task.priorityWeight,
  estimatedHours: task.estimatedHours ?? null,
  dueDate: task.dueDate ?? null,
  createdAt: task.createdAt,
  startedAt: task.startedAt ?? null,
  completedAt: task.completedAt ?? null,
  status: task.status,
  dependencies: (task.dependencies ?? []).map(id => id.toString()),
});

export interface LoadOptions {
  /** Include archived tasks (default false). */
  includeArchived?: boolean;
  /** Only tasks created or completed on/after this date. */
  since?: Date;
}

/** Loads the planning projection of every task the user can see. */
export const loadPlanningTasks = async (
  userId: string,
  options: LoadOptions = {}
): Promise<PlanningTask[]> => {
  const filter: FilterQuery<ITask> = { ...accessibleBy(userId) };
  if (!options.includeArchived) filter.isArchived = false;
  if (options.since) {
    filter.$and = [
      {
        $or: [
          { createdAt: { $gte: options.since } },
          { completedAt: { $gte: options.since } },
          { status: { $in: ['todo', 'in_progress'] } },
        ],
      },
    ];
  }
  return Task.find(filter).select(PLANNING_PROJECTION).lean<PlanningTask[]>();
};

/**
 * Validates a proposed dependency list for a task:
 *  - every dependency must exist and be visible to the user,
 *  - a task cannot depend on itself,
 *  - the edge must not close a cycle in the user's dependency graph.
 */
export const assertValidDependencies = async (
  userId: string,
  taskId: string | null,
  dependencyIds: string[]
): Promise<void> => {
  if (dependencyIds.length === 0) return;
  const unique = [...new Set(dependencyIds)];
  if (taskId && unique.includes(taskId)) {
    throw createError('A task cannot depend on itself', 400);
  }

  const visible = await Task.countDocuments({ _id: { $in: unique }, ...accessibleBy(userId) });
  if (visible !== unique.length) {
    throw createError('One or more dependencies were not found or are not accessible', 400);
  }

  // A brand-new node with only incoming edges cannot create a cycle.
  if (!taskId) return;

  const tasks = await loadPlanningTasks(userId, { includeArchived: true });
  const graph = buildGraph(tasks.map(toSchedulable));
  for (const depId of unique) {
    if (wouldCreateCycle(graph, taskId, depId)) {
      throw createError('Adding this dependency would create a cycle', 409, {
        taskId,
        dependencyId: depId,
      });
    }
  }
};

/** Records a status transition on the document (saved by the caller). */
export const applyStatusTransition = (task: ITask, to: TaskStatus, actorId: string): boolean => {
  if (task.status === to) return false;
  task.statusHistory.push({
    from: task.status,
    to,
    at: new Date(),
    by: new mongoose.Types.ObjectId(actorId),
  });
  task.status = to;
  return true;
};
