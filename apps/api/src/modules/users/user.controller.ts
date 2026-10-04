// apps/api/src/modules/users/user.controller.ts
import type { Response } from 'express';
import { z } from 'zod';

import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { AuthService } from '@/modules/auth/auth.service';
import { Category } from '@/modules/categories/category.model';
import { Task } from '@/modules/tasks/task.model';
import { getPaginationParams } from '@/utils/pagination';

import { User } from './user.model';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z
    .object({
      email: z.boolean().optional(),
      push: z.boolean().optional(),
      taskReminders: z.boolean().optional(),
      taskAssignments: z.boolean().optional(),
    })
    .optional(),
  defaultView: z.enum(['list', 'kanban', 'calendar']).optional(),
});

const searchUsersSchema = z.object({
  query: z.string().min(1).max(100).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export class UserController {
  static getProfile = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const user = await User.findById(req.user!.id);
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: { user } });
  });

  static updateProfile = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const updateData = updateProfileSchema.parse(req.body);
    const user = await User.findByIdAndUpdate(req.user!.id, updateData, {
      new: true,
      runValidators: true,
    });
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, message: 'Profile updated successfully', data: { user } });
  });

  static updatePreferences = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const preferences = updatePreferencesSchema.parse(req.body);

    const $set: Record<string, unknown> = {};
    if (preferences.theme) $set['preferences.theme'] = preferences.theme;
    if (preferences.defaultView) $set['preferences.defaultView'] = preferences.defaultView;
    for (const [key, value] of Object.entries(preferences.notifications ?? {})) {
      if (value !== undefined) $set[`preferences.notifications.${key}`] = value;
    }

    const user = await User.findByIdAndUpdate(req.user!.id, { $set }, { new: true, runValidators: true });
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, message: 'Preferences updated successfully', data: { user } });
  });

  static searchUsers = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { query, page, limit } = searchUsersSchema.parse(req.query);

    const filter: Record<string, unknown> = { isActive: true };
    if (query) {
      const pattern = { $regex: escapeRegex(query), $options: 'i' };
      filter.$or = [{ username: pattern }, { firstName: pattern }, { lastName: pattern }, { email: pattern }];
    }

    const { offset, pagination } = getPaginationParams(page, limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username firstName lastName avatar bio createdAt')
        .sort({ username: 1 })
        .skip(offset)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({
      success: true,
      data: {
        users,
        pagination: { ...pagination, total, totalPages, hasNext: page < totalPages },
      },
    });
  });

  static getUserById = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);
    const user = await User.findOne({ _id: userId, isActive: true }).select(
      'username firstName lastName avatar bio timezone createdAt'
    );
    if (!user) throw createError('User not found', 404);
    res.json({ success: true, data: { user } });
  });

  static deleteAccount = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const user = await User.findById(userId);
    if (!user) throw createError('User not found', 404);

    // Soft delete: deactivate and free the unique identifiers for re-use.
    const stamp = Date.now();
    user.isActive = false;
    user.email = `deleted_${stamp}_${user.email}`;
    user.username = `del_${stamp.toString(36)}`;
    await user.save({ validateBeforeSave: false });
    await AuthService.logoutAllDevices(userId);

    res.json({ success: true, message: 'Account deactivated successfully' });
  });

  static getUserStats = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = req.user!.id;
    const [tasksCompleted, tasksActive, tasksCreated, categoriesCreated] = await Promise.all([
      Task.countDocuments({
        $or: [{ createdBy: userId }, { assignedTo: userId }],
        status: 'completed',
        isArchived: false,
      }),
      Task.countDocuments({
        $or: [{ createdBy: userId }, { assignedTo: userId }],
        status: { $in: ['todo', 'in_progress'] },
        isArchived: false,
      }),
      Task.countDocuments({ createdBy: userId }),
      Category.countDocuments({ createdBy: userId, isActive: true }),
    ]);

    res.json({
      success: true,
      data: { stats: { tasksCompleted, tasksActive, tasksCreated, categoriesCreated } },
    });
  });
}
