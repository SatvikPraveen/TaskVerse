// File: packages/types/zod/category.schema.ts

import { z } from 'zod';

// Color validation regex (hex colors)
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

// Category Schema
export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  color: z.string().regex(hexColorRegex, 'Invalid hex color format'),
  description: z.string().max(200, 'Description too long').optional(),
  userId: z.string(),
  taskCount: z.number().min(0).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Category Schema
export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long'),
  color: z.string().regex(hexColorRegex, 'Invalid hex color format'),
  description: z.string().max(200, 'Description too long').optional(),
});

// Update Category Schema
export const UpdateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(50, 'Category name too long').optional(),
  color: z.string().regex(hexColorRegex, 'Invalid hex color format').optional(),
  description: z.string().max(200, 'Description too long').optional(),
});

// Category Query Schema
export const CategoryQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['name', 'createdAt', 'updatedAt', 'taskCount']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  includeTasks: z.coerce.boolean().default(false),
});

// Category with Task Count Schema
export const CategoryWithStatsSchema = CategorySchema.extend({
  taskCount: z.number().min(0),
  completedTaskCount: z.number().min(0),
  pendingTaskCount: z.number().min(0),
});

// Category with Tasks Schema (for detailed view)
export const CategoryWithTasksSchema = CategorySchema.extend({
  tasks: z.array(z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(['pending', 'in-progress', 'completed', 'cancelled']),
    priority: z.enum(['low', 'medium', 'high', 'urgent']),
    dueDate: z.date().nullable(),
    createdAt: z.date(),
  })).optional(),
});

// Paginated Categories Response Schema
export const PaginatedCategoriesSchema = z.object({
  categories: z.array(CategoryWithStatsSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// Category Statistics Schema
export const CategoryStatsSchema = z.object({
  totalCategories: z.number(),
  categoriesWithTasks: z.number(),
  categoriesWithoutTasks: z.number(),
  mostUsedCategory: z.object({
    id: z.string(),
    name: z.string(),
    taskCount: z.number(),
  }).nullable(),
  averageTasksPerCategory: z.number(),
});

// Bulk Category Operation Schema
export const BulkCategoryOperationSchema = z.object({
  categoryIds: z.array(z.string()).min(1, 'At least one category ID is required'),
  operation: z.enum(['delete', 'merge']),
  data: z.object({
    targetCategoryId: z.string().optional(), // For merge operation
  }).optional(),
});

// Default Categories Schema (for seeding)
export const DefaultCategorySchema = z.object({
  name: z.string(),
  color: z.string(),
  description: z.string().optional(),
});

// Predefined color palette
export const CategoryColorsSchema = z.array(z.string()).default([
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA',
  '#F1948A', '#85929E', '#A569BD', '#5DADE2', '#58D68D',
  '#F4D03F', '#EB984E', '#AED6F1', '#A9DFBF', '#F9E79F'
]);

// Category Import/Export Schema
export const CategoryExportSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    color: z.string(),
    description: z.string().optional(),
  })),
  exportedAt: z.date(),
  version: z.string(),
});

export const CategoryImportSchema = z.object({
  categories: z.array(CreateCategorySchema),
  overwriteExisting: z.boolean().default(false),
});

// Type exports
export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>;
export type CategoryQuery = z.infer<typeof CategoryQuerySchema>;
export type CategoryWithStats = z.infer<typeof CategoryWithStatsSchema>;
export type CategoryWithTasks = z.infer<typeof CategoryWithTasksSchema>;
export type PaginatedCategories = z.infer<typeof PaginatedCategoriesSchema>;
export type CategoryStats = z.infer<typeof CategoryStatsSchema>;
export type BulkCategoryOperation = z.infer<typeof BulkCategoryOperationSchema>;
export type DefaultCategory = z.infer<typeof DefaultCategorySchema>;
export type CategoryColors = z.infer<typeof CategoryColorsSchema>;
export type CategoryExport = z.infer<typeof CategoryExportSchema>;
export type CategoryImport = z.infer<typeof CategoryImportSchema>;