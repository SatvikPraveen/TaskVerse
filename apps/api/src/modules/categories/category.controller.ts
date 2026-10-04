// apps/api/src/modules/categories/category.controller.ts
import type { Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';

import { domainEvents } from '@/events/domain-events';
import type { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';
import { Task } from '@/modules/tasks/task.model';

import { Category } from './category.model';

const hexColor = z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const createCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  color: hexColor.default('#6366f1'),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().default(0),
});

const updateCategorySchema = createCategorySchema.partial();

const reorderCategoriesSchema = z.object({
  categories: z.array(z.object({ id: objectId, sortOrder: z.number() })).min(1),
});

export class CategoryController {
  static getCategories = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const categories = await Category.find({ createdBy: req.user!.id, isActive: true })
      .populate('taskCount')
      .sort({ sortOrder: 1, createdAt: 1 });
    res.json({ success: true, data: { categories } });
  });

  static getCategoryById = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { categoryId } = z.object({ categoryId: objectId }).parse(req.params);
    const category = await Category.findOne({
      _id: categoryId,
      createdBy: req.user!.id,
      isActive: true,
    }).populate('taskCount');
    if (!category) throw createError('Category not found', 404);
    res.json({ success: true, data: { category } });
  });

  static createCategory = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const input = createCategorySchema.parse(req.body);
    const category = await Category.create({ ...input, createdBy: req.user!.id });
    await category.populate('taskCount');
    await domainEvents.publish('category.created', {
      categoryId: category._id.toString(),
      name: category.name,
      actorId: req.user!.id,
      recipients: [req.user!.id],
      timestamp: new Date().toISOString(),
    });
    res.status(201).json({ success: true, message: 'Category created successfully', data: { category } });
  });

  static updateCategory = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { categoryId } = z.object({ categoryId: objectId }).parse(req.params);
    const input = updateCategorySchema.parse(req.body);

    const category = await Category.findOneAndUpdate(
      { _id: categoryId, createdBy: req.user!.id, isActive: true },
      input,
      { new: true, runValidators: true }
    ).populate('taskCount');
    if (!category) throw createError('Category not found', 404);
    await domainEvents.publish('category.updated', {
      categoryId: category._id.toString(),
      name: category.name,
      changes: Object.keys(input),
      actorId: req.user!.id,
      recipients: [req.user!.id],
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Category updated successfully', data: { category } });
  });

  static deleteCategory = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { categoryId } = z.object({ categoryId: objectId }).parse(req.params);
    const category = await Category.findOne({
      _id: categoryId,
      createdBy: req.user!.id,
      isActive: true,
    });
    if (!category) throw createError('Category not found', 404);

    // Soft delete and detach from tasks so the category can be purged later.
    category.isActive = false;
    await category.save();
    await Task.updateMany({ category: category._id }, { $unset: { category: 1 } });
    await domainEvents.publish('category.deleted', {
      categoryId: category._id.toString(),
      name: category.name,
      actorId: req.user!.id,
      recipients: [req.user!.id],
      timestamp: new Date().toISOString(),
    });

    res.json({ success: true, message: 'Category deleted successfully' });
  });

  static reorderCategories = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const { categories } = reorderCategoriesSchema.parse(req.body);
    const ids = categories.map(c => c.id);

    const owned = await Category.countDocuments({
      _id: { $in: ids },
      createdBy: req.user!.id,
      isActive: true,
    });
    if (owned !== new Set(ids).size) {
      throw createError('Some categories not found or do not belong to user', 400);
    }

    await Category.bulkWrite(
      categories.map(({ id, sortOrder }) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder } } },
      }))
    );

    res.json({ success: true, message: 'Categories reordered successfully' });
  });

  static getCategoryStats = asyncHandler<AuthRequest>(async (req, res: Response) => {
    const userId = new mongoose.Types.ObjectId(req.user!.id);

    const stats = await Category.aggregate([
      { $match: { createdBy: userId, isActive: true } },
      {
        $lookup: {
          from: 'tasks',
          let: { categoryId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$category', '$$categoryId'] }, isArchived: false } },
            { $project: { status: 1 } },
          ],
          as: 'tasks',
        },
      },
      {
        $project: {
          name: 1,
          color: 1,
          taskCount: { $size: '$tasks' },
          completedTasks: {
            $size: {
              $filter: { input: '$tasks', cond: { $eq: ['$$this.status', 'completed'] } },
            },
          },
        },
      },
      { $sort: { taskCount: -1, name: 1 } },
    ]);

    res.json({ success: true, data: { stats } });
  });
}
