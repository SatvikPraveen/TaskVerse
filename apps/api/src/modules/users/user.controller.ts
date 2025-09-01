// apps/api/src/modules/users/user.controller.ts
import { Response } from 'express';
import { z } from 'zod';
import { User } from './user.model';
import { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { getPaginationParams } from '@/utils/pagination';

// Validation schemas
const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  timezone: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.object({
    email: z.boolean().optional(),
    push: z.boolean().optional(),
    taskReminders: z.boolean().optional(),
    taskAssignments: z.boolean().optional(),
  }).optional(),
  defaultView: z.enum(['list', 'kanban', 'calendar']).optional(),
});

const searchUsersSchema = z.object({
  query: z.string().min(1).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
});

export class UserController {
  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    
    const user = await User.findById(userId);
    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  });

  static updateProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const updateData = updateProfileSchema.parse(req.body);

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    });
  });

  static updatePreferences = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const preferencesData = updatePreferencesSchema.parse(req.body);

    // Build update object for nested preferences
    const updateObject: any = {};
    if (preferencesData.theme) {
      updateObject['preferences.theme'] = preferencesData.theme;
    }
    if (preferencesData.defaultView) {
      updateObject['preferences.defaultView'] = preferencesData.defaultView;
    }
    if (preferencesData.notifications) {
      Object.entries(preferencesData.notifications).forEach(([key, value]) => {
        updateObject[`preferences.notifications.${key}`] = value;
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateObject },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: { user },
    });
  });

  static searchUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { query, page, limit } = searchUsersSchema.parse(req.query);
    
    const filter: any = { isActive: true };
    
    if (query) {
      filter.$or = [
        { username: { $regex: query, $options: 'i' } },
        { firstName: { $regex: query, $options: 'i' } },
        { lastName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
      ];
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

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          ...pagination,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  });

  static getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { userId } = z.object({ userId: z.string() }).parse(req.params);

    const user = await User.findById(userId)
      .select('username firstName lastName avatar bio timezone createdAt');

    if (!user) {
      throw createError('User not found', 404);
    }

    res.json({
      success: true,
      data: { user },
    });
  });

  static deleteAccount = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // Instead of hard delete, we'll deactivate the account
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        isActive: false,
        email: `deleted_${Date.now()}_${user?.email}`, // Prevent email conflicts
        username: `deleted_${Date.now()}_${user?.username}`, // Prevent username conflicts
      },
      { new: true }
    );

    if (!user) {
      throw createError('User not found', 404);
    }

    // TODO: Handle cascade deletion or anonymization of user's data
    // - Tasks created by user
    // - Categories owned by user
    // - Comments made by user
    // - etc.

    res.json({
      success: true,
      message: 'Account deactivated successfully',
    });
  });

  static getUserStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement when Task model is ready
    // const stats = await Promise.all([
    //   Task.countDocuments({ assignedTo: userId, status: 'completed' }),
    //   Task.countDocuments({ assignedTo: userId, status: { $ne: 'completed' } }),
    //   Task.countDocuments({ createdBy: userId }),
    //   Category.countDocuments({ createdBy: userId }),
    // ]);

    // For now, return placeholder data
    const stats = {
      tasksCompleted: 0,
      tasksActive: 0,
      tasksCreated: 0,
      categoriesCreated: 0,
    };

    res.json({
      success: true,
      data: { stats },
    });
  });
}