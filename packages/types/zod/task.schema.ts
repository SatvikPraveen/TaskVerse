// File: packages/types/zod/task.schema.ts

import { z } from 'zod';

// Task Status Enum
export const TaskStatusEnum = z.enum(['pending', 'in-progress', 'completed', 'cancelled']);

// Task Priority Enum
export const TaskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);

// File Attachment Schema
export const AttachmentSchema = z.object({
  id: z.string(),
  filename: z.string().min(1, 'Filename is required'),
  url: z.string().url('Invalid URL'),
  size: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
  uploadedAt: z.date(),
});

// Task Schema
export const TaskSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  dueDate: z.date().nullable().optional(),
  completedAt: z.date().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  attachments: z.array(AttachmentSchema).optional(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Create Task Schema
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  description: z.string().max(2000, 'Description too long').optional(),
  priority: TaskPriorityEnum.default('medium'),
  dueDate: z.string().datetime().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

// Update Task Schema
export const UpdateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').optional(),
  description: z.string().max(2000, 'Description too long').optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

// Task Query Schema
export const TaskQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  categoryId: z.string().optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  dueDateFrom: z.string().datetime().optional(),
  dueDateTo: z.string().datetime().optional(),
});

// Task Statistics Schema
export const TaskStatsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  inProgress: z.number(),
  completed: z.number(),
  cancelled: z.number(),
  overdue: z.number(),
  dueToday: z.number(),
  dueSoon: z.number(),
  byPriority: z.object({
    low: z.number(),
    medium: z.number(),
    high: z.number(),
    urgent: z.number(),
  }),
  byCategory: z.array(z.object({
    categoryId: z.string().nullable(),
    categoryName: z.string().nullable(),
    count: z.number(),
  })),
});

// Bulk Task Operation Schema
export const BulkTaskOperationSchema = z.object({
  taskIds: z.array(z.string()).min(1, 'At least one task ID is required'),
  operation: z.enum(['delete', 'updateStatus', 'updateCategory', 'updatePriority']),
  data: z.object({
    status: TaskStatusEnum.optional(),
    categoryId: z.string().nullable().optional(),
    priority: TaskPriorityEnum.optional(),
  }).optional(),
});

// Task with populated category
export const TaskWithCategorySchema = TaskSchema.extend({
  category: z.object({
    id: z.string(),
    name: z.string(),
    color: z.string(),
  }).nullable().optional(),
});

// Paginated Tasks Response Schema
export const PaginatedTasksSchema = z.object({
  tasks: z.array(TaskWithCategorySchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

// Upload Attachment Schema
export const UploadAttachmentSchema = z.object({
  taskId: z.string(),
  fileId: z.string(),
  filename: z.string().min(1, 'Filename is required'),
  size: z.number().positive('File size must be positive'),
  mimeType: z.string().min(1, 'MIME type is required'),
});

// Type exports
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;
export type TaskStats = z.infer<typeof TaskStatsSchema>;
export type BulkTaskOperation = z.infer<typeof BulkTaskOperationSchema>;
export type TaskWithCategory = z.infer<typeof TaskWithCategorySchema>;
export type PaginatedTasks = z.infer<typeof PaginatedTasksSchema>;
export type UploadAttachmentInput = z.infer<typeof UploadAttachmentSchema>;