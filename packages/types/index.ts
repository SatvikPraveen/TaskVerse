// File: packages/types/index.ts

export * from './zod/auth.schema';
export * from './zod/task.schema';
export * from './zod/category.schema';

import type { TaskPriority, TaskStatus, Task } from './zod/task.schema';
import type { Category } from './zod/category.schema';

// Common API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
  currentPage: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  meta: PaginationMeta;
}

// WebSocket Event types
export interface WebSocketEvent<T = unknown> {
  type: string;
  data?: T;
  userId?: string;
  timestamp: Date;
}

export interface TaskWebSocketEvents {
  'task:created': WebSocketEvent<Task>;
  'task:updated': WebSocketEvent<Task>;
  'task:deleted': WebSocketEvent<{ id: string }>;
  'task:status-changed': WebSocketEvent<{
    id: string;
    status: TaskStatus;
    previousStatus: TaskStatus;
  }>;
}

export interface CategoryWebSocketEvents {
  'category:created': WebSocketEvent<Category>;
  'category:updated': WebSocketEvent<Category>;
  'category:deleted': WebSocketEvent<{ id: string }>;
}

// Upload types
export interface PresignedUploadResponse {
  uploadUrl: string;
  fileUrl: string;
  fileId: string;
  expiresIn: number;
}

export interface FileUploadProgress {
  fileId: string;
  filename: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

// Dashboard/Analytics types
export interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  totalCategories: number;
  tasksCompletedToday: number;
  tasksCompletedThisWeek: number;
  tasksCompletedThisMonth: number;
  productivityScore: number;
}

export interface TaskTrend {
  date: string;
  created: number;
  completed: number;
  pending: number;
}

export interface CategoryUsage {
  categoryId: string;
  categoryName: string;
  color: string;
  taskCount: number;
  completedCount: number;
  percentage: number;
}

// Filter and Search types
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  categoryIds?: string[];
  dueDateFrom?: Date;
  dueDateTo?: Date;
  hasAttachments?: boolean;
  isOverdue?: boolean;
}

export interface SearchFilters extends TaskFilters {
  query?: string;
  searchIn?: ('title' | 'description')[];
}

// Error types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  code: string;
  message: string;
  statusCode: number;
  details?: unknown;
  validationErrors?: ValidationError[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SortOptions {
  field: string;
  order: 'asc' | 'desc';
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  sort?: SortOptions;
  populate?: string[];
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeAttachments: boolean;
  dateRange?: { from: Date; to: Date };
  filters?: TaskFilters;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; message: string }>;
}
