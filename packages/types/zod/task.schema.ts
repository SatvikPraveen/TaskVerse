// File: packages/types/zod/task.schema.ts
import { z } from 'zod';

import { UserSummarySchema } from './auth.schema';
import { CategorySchema } from './category.schema';
import { IsoDateSchema, ObjectIdSchema, PaginationQuerySchema, SortOrderEnum } from './common.schema';

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;

export const TaskStatusEnum = z.enum(TASK_STATUSES);
export const TaskPriorityEnum = z.enum(TASK_PRIORITIES);

/** Ordinal weight of each priority; shared by sorting and the scheduler. */
export const PRIORITY_WEIGHT: Record<z.infer<typeof TaskPriorityEnum>, number> = {
  low: 1,
  medium: 2,
  high: 3,
  urgent: 4,
};

export const SubtaskSchema = z.object({
  _id: ObjectIdSchema,
  title: z.string().min(1).max(200),
  isCompleted: z.boolean(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const CommentSchema = z.object({
  _id: ObjectIdSchema,
  content: z.string().min(1).max(2000),
  author: UserSummarySchema,
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const AttachmentSchema = z.object({
  _id: ObjectIdSchema,
  filename: z.string(),
  originalName: z.string(),
  mimeType: z.string(),
  size: z.number().positive(),
  url: z.string().url(),
  uploadedBy: z.union([ObjectIdSchema, UserSummarySchema]),
  uploadedAt: IsoDateSchema,
});

/** A task as serialised by the API with its usual populations. */
export const TaskSchema = z.object({
  _id: ObjectIdSchema,
  id: ObjectIdSchema.optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  priorityWeight: z.number().int().min(1).max(4),
  category: CategorySchema.pick({ _id: true, name: true, color: true, icon: true }).nullable().optional(),
  assignedTo: UserSummarySchema.nullable().optional(),
  createdBy: UserSummarySchema,
  dueDate: IsoDateSchema.optional(),
  startDate: IsoDateSchema.optional(),
  completedAt: IsoDateSchema.optional(),
  estimatedHours: z.number().min(0).optional(),
  actualHours: z.number().min(0).optional(),
  tags: z.array(z.string().max(50)),
  subtasks: z.array(SubtaskSchema),
  comments: z.array(CommentSchema),
  attachments: z.array(AttachmentSchema),
  isArchived: z.boolean(),
  position: z.number(),
  completionPercentage: z.number().min(0).max(100),
  isOverdue: z.boolean(),
  createdAt: IsoDateSchema,
  updatedAt: IsoDateSchema,
});

export const CreateSubtaskSchema = z.object({
  title: z.string().min(1, 'Subtask title is required').max(200).trim(),
  isCompleted: z.boolean().default(false),
});

export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long').trim(),
  description: z.string().max(5000, 'Description too long').optional(),
  status: TaskStatusEnum.default('todo'),
  priority: TaskPriorityEnum.default('medium'),
  category: ObjectIdSchema.optional(),
  assignedTo: ObjectIdSchema.optional(),
  dueDate: z.string().datetime().optional(),
  startDate: z.string().datetime().optional(),
  estimatedHours: z.number().min(0).optional(),
  tags: z.array(z.string().max(50)).default([]),
  subtasks: z.array(CreateSubtaskSchema).default([]),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  actualHours: z.number().min(0).optional(),
  isArchived: z.boolean().optional(),
  position: z.number().optional(),
});

export const TaskSortByEnum = z.enum([
  'createdAt',
  'updatedAt',
  'dueDate',
  'priority',
  'title',
  'position',
]);

/** Query-string filters accepted by GET /api/tasks. */
export const TaskFiltersSchema = PaginationQuerySchema.extend({
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  category: ObjectIdSchema.optional(),
  assignedTo: ObjectIdSchema.optional(),
  search: z.string().max(200).optional(),
  /** Comma-separated list. */
  tags: z.string().optional(),
  dueAfter: z.string().datetime().optional(),
  dueBefore: z.string().datetime().optional(),
  archived: z.boolean().default(false),
  sortBy: TaskSortByEnum.default('position'),
  sortOrder: SortOrderEnum.default('asc'),
});

export const CommentInputSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(2000).trim(),
});

export const UpdateSubtaskSchema = z.object({
  isCompleted: z.boolean(),
});

export const TaskStatsSchema = z.object({
  todo: z.number().int(),
  in_progress: z.number().int(),
  completed: z.number().int(),
  cancelled: z.number().int(),
  overdue: z.number().int(),
});

export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;
export type Subtask = z.infer<typeof SubtaskSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Attachment = z.infer<typeof AttachmentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CreateTaskInput = z.input<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.input<typeof UpdateTaskSchema>;
export type TaskSortBy = z.infer<typeof TaskSortByEnum>;
export type TaskFiltersInput = z.input<typeof TaskFiltersSchema>;
export type CommentInput = z.infer<typeof CommentInputSchema>;
export type UpdateSubtaskInput = z.infer<typeof UpdateSubtaskSchema>;
export type TaskStats = z.infer<typeof TaskStatsSchema>;
