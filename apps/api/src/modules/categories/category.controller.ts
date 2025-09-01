// apps/api/src/modules/categories/category.controller.ts
import { Response } from 'express';
import { z } from 'zod';
import { Category } from './category.model';
import { AuthRequest } from '@/middleware/auth';
import { asyncHandler, createError } from '@/middleware/error';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100).trim(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).default('#6366f1'),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().default(0),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().optional(),
});

const reorderCategoriesSchema = z.object({
  categories: z.array(z.object({
    id: z.string(),
    sortOrder: z.number(),
  })),
});

export class CategoryController {
  static getCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    const categories = await Category.find({
      createdBy: userId,
      isActive: true,
    })
    .populate('taskCount')
    .sort({ sortOrder: 1, createdAt: 1 });

    res.json({
      success: true,
      data: { categories },
    });
  });

  static getCategoryById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { categoryId } = z.object({ categoryId: z.string() }).parse(req.params);

    const category = await Category.findOne({
      _id: categoryId,
      createdBy: userId,
      isActive: true,
    }).populate('taskCount');

    if (!category) {
      throw createError('Category not found', 404);
    }

    res.json({
      success: true,
      data: { category },
    });
  });

  static createCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const categoryData = createCategorySchema.parse(req.body);

    const category = new Category({
      ...categoryData,
      createdBy: userId,
    });

    await category.save();
    await category.populate('taskCount');

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category },
    });
  });

  static updateCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { categoryId } = z.object({ categoryId: z.string() }).parse(req.params);
    const updateData = updateCategorySchema.parse(req.body);

    const category = await Category.findOneAndUpdate(
      {
        _id: categoryId,
        createdBy: userId,
        isActive: true,
      },
      updateData,
      { new: true, runValidators: true }
    ).populate('taskCount');

    if (!category) {
      throw createError('Category not found', 404);
    }

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: { category },
    });
  });

  static deleteCategory = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { categoryId } = z.object({ categoryId: z.string() }).parse(req.params);

    // Check if category exists and belongs to user
    const category = await Category.findOne({
      _id: categoryId,
      createdBy: userId,
      isActive: true,
    });

    if (!category) {
      throw createError('Category not found', 404);
    }

    // Check if category is being used by tasks
    // TODO: Implement when Task model is ready
    // const taskCount = await Task.countDocuments({ category: categoryId });
    // if (taskCount > 0) {
    //   throw createError('Cannot delete category that contains tasks', 400);
    // }

    // Soft delete
    category.isActive = false;
    await category.save();

    res.json({
      success: true,
      message: 'Category deleted successfully',
    });
  });

  static reorderCategories = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { categories } = reorderCategoriesSchema.parse(req.body);

    // Validate all categories belong to user
    const categoryIds = categories.map(c => c.id);
    const existingCategories = await Category.find({
      _id: { $in: categoryIds },
      createdBy: userId,
      isActive: true,
    });

    if (existingCategories.length !== categories.length) {
      throw createError('Some categories not found or do not belong to user', 400);
    }

    // Update sort orders
    const updatePromises = categories.map(({ id, sortOrder }) =>
      Category.updateOne({ _id: id }, { sortOrder })
    );

    await Promise.all(updatePromises);

    res.json({
      success: true,
      message: 'Categories reordered successfully',
    });
  });

  static getCategoryStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement when Task model is ready
    // const stats = await Category.aggregate([
    //   {
    //     $match: {
    //       createdBy: new mongoose.Types.ObjectId(userId),
    //       isActive: true,
    //     },
    //   },
    //   {
    //     $lookup: {
    //       from: 'tasks',
    //       localField: '_id',
    //       foreignField: 'category',
    //       as: 'tasks',
    //     },
    //   },
    //   {
    //     $project: {
    //       name: 1,
    //       color: 1,
    //       taskCount: { $size: '$tasks' },
    //       completedTasks: {
    //         $size: {
    //           $filter: {
    //             input: '$tasks',
    //             cond: { $eq: ['$$this.status', 'completed'] },
    //           },
    //         },
    //       },
    //     },
    //   },
    // ]);

    // For now, return basic category info
    const categories = await Category.find({
      createdBy: userId,
      isActive: true,
    }).select('name color');

    const stats = categories.map(category => ({
      _id: category._id,
      name: category.name,
      color: category.color,
      taskCount: 0,
      completedTasks: 0,
    }));

    res.json({
      success: true,
      data: { stats },
    });
  });
}