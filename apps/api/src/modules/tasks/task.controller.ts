// apps/api/src/modules/tasks/task.controller.ts
import type { Response } from 'express';
import mongoose, { type FilterQuery, type SortOrder } from 'mongoose';
import { z } from 'zod';

import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { getPaginationParams } from '@/utils/pagination';

import { type ITask, PRIORITY_WEIGHT, Task, TASK_PRIORITIES, TASK_STATUSES } from './task.model';
import { accessibleBy, applyStatusTransition, assertValidDependencies } from './task.service';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const createTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES).default('todo'),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  category: objectId.optional(),
  assignedTo: objectId.optional(),
  dependencies: z.array(objectId).max(50).default([]),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string().max(50)).default([]),
  subtasks: z
    .array(z.object({ title: z.string().min(1).max(200).trim(), isCompleted: z.boolean().default(false) }))
    .default([]),
});

const updateTaskSchema = createTaskSchema.partial().extend({
  actualHours: z.number().min(0).optional(),
  isArchived: z.boolean().optional(),
  position: z.number().optional(),
});

const getTasksSchema = z.object({
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  category: objectId.optional(),
  assignedTo: objectId.optional(),
  search: z.string().max(200).optional(),
  tags: z.string().optional(),
  dueAfter: z.string().datetime().optional(),
  dueBefore: z.string().datetime().optional(),
  archived: z
    .enum(['true', 'false'])
    .default('false')
    .transform(v => v === 'true'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'position'])
    .default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export const TASK_POPULATE = [
  { path: 'category', select: 'name color icon' },
  { path: 'assignedTo', select: 'username firstName lastName avatar' },
  { path: 'createdBy', select: 'username firstName lastName avatar' },
  { path: 'comments.author', select: 'username firstName lastName avatar' },
  { path: 'dependencies', select: 'title status priority dueDate' },
];

export class TaskController {
  static getTasks = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const q = getTasksSchema.parse(req.query);

    const filter: FilterQuery<ITask> = { ...accessibleBy(userId), isArchived: q.archived };
    if (q.status) filter.status = q.status;
    if (q.priority) filter.priority = q.priority;
    if (q.category) filter.category = q.category;
    if (q.assignedTo) filter.assignedTo = q.assignedTo;
    if (q.tags) {
      filter.tags = { $in: q.tags.split(',').map(tag => tag.trim()).filter(Boolean) };
    }
    if (q.dueAfter || q.dueBefore) {
      filter.dueDate = {
        ...(q.dueAfter && { $gte: new Date(q.dueAfter) }),
        ...(q.dueBefore && { $lte: new Date(q.dueBefore) }),
      };
    }
    if (q.search) filter.$text = { $search: q.search };

    const { offset, pagination } = getPaginationParams(q.page, q.limit);
    const direction: SortOrder = q.sortOrder === 'desc' ? -1 : 1;
    const sortField = q.sortBy === 'priority' ? 'priorityWeight' : q.sortBy;
    const sort: Record<string, SortOrder> = { [sortField]: direction, _id: 1 };

    const [tasks, total] = await Promise.all([
      Task.find(filter).populate(TASK_POPULATE).sort(sort).skip(offset).limit(q.limit),
      Task.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / q.limit);
    res.json({
      success: true,
      data: {
        tasks,
        pagination: { ...pagination, total, totalPages, hasNext: q.page < totalPages },
      },
    });
  });

  static getTaskById = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { taskId } = z.object({ taskId: objectId }).parse(req.params);
    const task = await Task.findOne({ _id: taskId, ...accessibleBy(req.user!.id) }).populate([
      ...TASK_POPULATE,
      { path: 'attachments.uploadedBy', select: 'username firstName lastName' },
      { path: 'statusHistory.by', select: 'username' },
    ]);
    if (!task) throw createError('Task not found', 404);
    res.json({ success: true, data: { task } });
  });

  static createTask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const input = createTaskSchema.parse(req.body);
    await assertValidDependencies(userId, null, input.dependencies);

    const task = new Task({
      ...input,
      status: 'todo',
      priorityWeight: PRIORITY_WEIGHT[input.priority],
      createdBy: userId,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
    });
    // Route the initial status through the transition log too.
    if (input.status !== 'todo') applyStatusTransition(task, input.status, userId);
    else task.statusHistory.push({ from: null, to: 'todo', at: new Date(), by: new mongoose.Types.ObjectId(userId) });

    await task.save();
    await task.populate(TASK_POPULATE);
    res.status(201).json({ success: true, message: 'Task created successfully', data: { task } });
  });

  static updateTask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: objectId }).parse(req.params);
    const input = updateTaskSchema.parse(req.body);

    const task = await Task.findOne({ _id: taskId, ...accessibleBy(userId) });
    if (!task) throw createError('Task not found or access denied', 404);

    const { dueDate, startDate, subtasks, status, dependencies, ...rest } = input;
    if (dependencies !== undefined) {
      await assertValidDependencies(userId, taskId, dependencies);
      task.set('dependencies', dependencies);
    }
    task.set(rest);
    if (dueDate !== undefined) task.dueDate = new Date(dueDate);
    if (startDate !== undefined) task.startDate = new Date(startDate);
    if (subtasks !== undefined) task.set('subtasks', subtasks);
    if (status !== undefined) applyStatusTransition(task, status, userId);

    await task.save();
    await task.populate(TASK_POPULATE);
    res.json({ success: true, message: 'Task updated successfully', data: { task } });
  });

  static deleteTask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { taskId } = z.object({ taskId: objectId }).parse(req.params);
    // Only the creator may delete.
    const task = await Task.findOneAndDelete({ _id: taskId, createdBy: req.user!.id });
    if (!task) throw createError('Task not found or access denied', 404);
    // Detach dependents so the graph never references a missing node.
    await Task.updateMany({ dependencies: task._id }, { $pull: { dependencies: task._id } });
    res.json({ success: true, message: 'Task deleted successfully' });
  });

  static addComment = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { taskId } = z.object({ taskId: objectId }).parse(req.params);
    const { content } = z.object({ content: z.string().min(1).max(2000).trim() }).parse(req.body);

    const task = await Task.findOneAndUpdate(
      { _id: taskId, ...accessibleBy(req.user!.id) },
      { $push: { comments: { content, author: req.user!.id } } },
      { new: true }
    ).populate('comments.author', 'username firstName lastName avatar');
    if (!task) throw createError('Task not found or access denied', 404);

    const comment = task.comments[task.comments.length - 1];
    res.status(201).json({ success: true, message: 'Comment added successfully', data: { comment } });
  });

  static updateSubtask = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { taskId, subtaskId } = z
      .object({ taskId: objectId, subtaskId: objectId })
      .parse(req.params);
    const { isCompleted } = z.object({ isCompleted: z.boolean() }).parse(req.body);

    const task = await Task.findOneAndUpdate(
      { _id: taskId, 'subtasks._id': subtaskId, ...accessibleBy(req.user!.id) },
      { $set: { 'subtasks.$.isCompleted': isCompleted } },
      { new: true }
    ).populate(TASK_POPULATE);
    if (!task) throw createError('Task or subtask not found', 404);

    res.json({ success: true, message: 'Subtask updated successfully', data: { task } });
  });

  static getTaskStats = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.user!.id);
    const scope = { $or: [{ createdBy: userId }, { assignedTo: userId }], isArchived: false };

    const [byStatus, overdue] = await Promise.all([
      Task.aggregate<{ _id: string; count: number }>([
        { $match: scope },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.countDocuments({
        ...scope,
        dueDate: { $lt: new Date() },
        status: { $nin: ['completed', 'cancelled'] },
      }),
    ]);

    const stats: Record<string, number> = { todo: 0, in_progress: 0, completed: 0, cancelled: 0 };
    for (const row of byStatus) stats[row._id] = row.count;

    res.json({ success: true, data: { stats: { ...stats, overdue } } });
  });
}
