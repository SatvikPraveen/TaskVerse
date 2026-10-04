// File: packages/types/zod/category.schema.ts
import { z } from 'zod';

import { HexColorSchema, IsoDateSchema, ObjectIdSchema } from './common.schema';

export const CategorySchema = z.object({
  _id: ObjectIdSchema,
  id: ObjectIdSchema.optional(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: HexColorSchema,
  icon: z.string().max(50).optional(),
  createdBy: ObjectIdSchema,
  isDefault: z.boolean(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  /** Populated virtual: number of tasks referencing this category. */
  taskCount: z.number().int().min(0).optional(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100, 'Category name too long').trim(),
  description: z.string().max(500, 'Description too long').optional(),
  color: HexColorSchema.default('#6366f1'),
  icon: z.string().max(50).optional(),
  sortOrder: z.number().default(0),
});

export const UpdateCategorySchema = CreateCategorySchema.partial();

export const ReorderCategoriesSchema = z.object({
  categories: z.array(z.object({ id: ObjectIdSchema, sortOrder: z.number() })).min(1),
});

export const CategoryStatsSchema = z.object({
  _id: ObjectIdSchema,
  name: z.string(),
  color: HexColorSchema,
  taskCount: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
});

/** Brand-neutral palette offered by the category form. */
export const CATEGORY_COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#6b7280',
] as const;

export type Category = z.infer<typeof CategorySchema>;
export type CreateCategoryInput = z.input<typeof CreateCategorySchema>;
export type UpdateCategoryInput = z.input<typeof UpdateCategorySchema>;
export type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>;
export type CategoryStats = z.infer<typeof CategoryStatsSchema>;
