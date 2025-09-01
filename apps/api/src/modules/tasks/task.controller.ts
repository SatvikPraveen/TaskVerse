// apps/api/src/modules/tasks/task.controller.ts
import { Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Task, TaskStatus, TaskPriority } from './task.model';
import { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { getPaginationParams } from '@/utils/pagination';

const createTaskSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).default('todo'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string().max(50)).default([]),
  subtasks: z.array(z.object({
    title: z.string().min(1).max(200).trim(),
    isCompleted: z.boolean().default(false),
  })).default([]),
});

const updateTaskSchema = createTaskSchema.partial();

const getTasksSchema = z.object({
  status: z.enum(['todo', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  category: z.string().optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
  dueAfter: z.string().datetime().optional(),
  dueBefore: z.string().datetime().optional(),
  archived: z.boolean().default(false),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title', 'position']).default('position'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export class TaskController {
  static getTasks = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const queryParams = getTasksSchema.parse(req.query);
    
    const {
      status, priority, category, assignedTo, search, tags,
      dueAfter, dueBefore, archived, page, limit, sortBy, sortOrder
    } = queryParams;

    // Build filter
    const filter: any = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
      isArchived: archived,
    };

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Date filters
    if (dueAfter || dueBefore) {
      filter.dueDate = {};
      if (dueAfter) filter.dueDate.$gte = new Date(dueAfter);
      if (dueBefore) filter.dueDate.$lte = new Date(dueBefore);
    }

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    const { offset, pagination } = getPaginationParams(page, limit);

    // Build sort
    const sort: any = {};
    if (sortBy === 'priority') {
      // Custom priority sorting
      sort.priority = { urgent: 4, high: 3, medium: 2, low: 1 }[priority as any] || 0;
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate('category', 'name color icon')
        .populate('assignedTo', 'username firstName lastName avatar')
        .populate('createdBy', 'username firstName lastName avatar')
        .populate('comments.author', 'username firstName lastName avatar')
        .sort(sort)
        .skip(offset)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        tasks,
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  static getTaskById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: z.string() }).parse(req.params);

    const task = await Task.findOne({
      _id: taskId,
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
    })
    .populate('category', 'name color icon')
    .populate('assignedTo', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar')
    .populate('comments.author', 'username firstName lastName avatar')
    .populate('attachments.uploadedBy', 'username firstName lastName');

    if (!task) {
      throw createError('Task not found', 404);
    }

    res.json({
      success: true,
      data: { task },
    });
  });

  static createTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const taskData = createTaskSchema.parse(req.body);

    // Convert date strings to Date objects
    const processedData: any = {
      ...taskData,
      createdBy: userId,
    };

    if (taskData.dueDate) processedData.dueDate = new Date(taskData.dueDate);
    if (taskData.startDate) processedData.startDate = new Date(taskData.startDate);

    const task = new Task(processedData);
    await task.save();
    
    await task.populate([
      { path: 'category', select: 'name color icon' },
      { path: 'assignedTo', select: 'username firstName lastName avatar' },
      { path: 'createdBy', select: 'username firstName lastName avatar' },
    ]);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: { task },
    });
  });

  static updateTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: z.string() }).parse(req.params);
    const updateData = updateTaskSchema.parse(req.body);

    // Convert date strings to Date objects
    const processedData: any = { ...updateData };
    if (updateData.dueDate) processedData.dueDate = new Date(updateData.dueDate);
    if (updateData.startDate) processedData.startDate = new Date(updateData.startDate);

    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ],
      },
      processedData,
      { new: true, runValidators: true }
    )
    .populate('category', 'name color icon')
    .populate('assignedTo', 'username firstName lastName avatar')
    .populate('createdBy', 'username firstName lastName avatar');

    if (!task) {
      throw createError('Task not found or access denied', 404);
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: { task },
    });
  });

  static deleteTask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: z.string() }).parse(req.params);

    const task = await Task.findOneAndDelete({
      _id: taskId,
      createdBy: userId, // Only creator can delete
    });

    if (!task) {
      throw createError('Task not found or access denied', 404);
    }

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  });

  static addComment = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId } = z.object({ taskId: z.string() }).parse(req.params);
    const { content } = z.object({
      content: z.string().min(1).max(2000).trim(),
    }).parse(req.body);

    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ],
      },
      {
        $push: {
          comments: {
            content,
            author: userId,
          },
        },
      },
      { new: true }
    )
    .populate('comments.author', 'username firstName lastName avatar');

    if (!task) {
      throw createError('Task not found or access denied', 404);
    }

    const newComment = task.comments[task.comments.length - 1];

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: { comment: newComment },
    });
  });

  static updateSubtask = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { taskId, subtaskId } = z.object({
      taskId: z.string(),
      subtaskId: z.string(),
    }).parse(req.params);
    
    const { isCompleted } = z.object({
      isCompleted: z.boolean(),
    }).parse(req.body);

    const task = await Task.findOneAndUpdate(
      {
        _id: taskId,
        'subtasks._id': subtaskId,
        $or: [
          { createdBy: userId },
          { assignedTo: userId }
        ],
      },
      {
        $set: {
          'subtasks.$.isCompleted': isCompleted,
        },
      },
      { new: true }
    );

    if (!task) {
      throw createError('Task or subtask not found', 404);
    }

    res.json({
      success: true,
      message: 'Subtask updated successfully',
      data: { task },
    });
  });

  static getTaskStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const stats = await Task.aggregate([
      {
        $match: {
          $or: [
            { createdBy: new mongoose.Types.ObjectId(userId) },
            { assignedTo: new mongoose.Types.ObjectId(userId) }
          ],
          isArchived: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const overdueTasks = await Task.countDocuments({
      $or: [
        { createdBy: userId },
        { assignedTo: userId }
      ],
      dueDate: { $lt: new Date() },
      status: { $nin: ['completed', 'cancelled'] },
      isArchived: false,
    });

    const formattedStats = {
      todo: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
      overdue: overdueTasks,
    };

    stats.forEach(stat => {
      formattedStats[stat._id as keyof typeof formattedStats] = stat.count;
    });

    res.json({
      success: true,
      data: { stats: formattedStats },
    });
  });
}