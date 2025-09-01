// File: packages/types/index.ts

// Auth exports
export * from './zod/auth.schema';

// Task exports  
export * from './zod/task.schema';

// Category exports
export * from './zod/category.schema';

// Common API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
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
export interface WebSocketEvent<T = any> {
  type: string;
  data?: T;
  userId?: string;
  timestamp: Date;
}

export interface TaskWebSocketEvents {
  'task:created': WebSocketEvent<Task>;
  'task:updated': WebSocketEvent<Task>;
  'task:deleted': WebSocketEvent<{ id: string }>;
  'task:status-changed': WebSocketEvent<{ id: string; status: TaskStatus; previousStatus: TaskStatus }>;
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

// User Preferences types
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  defaultTaskPriority: TaskPriority;
  defaultTaskStatus: TaskStatus;
  notifications: {
    email: boolean;
    push: boolean;
    dueDateReminders: boolean;
    taskAssignments: boolean;
  };
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  timezone: string;
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
  details?: any;
  validationErrors?: ValidationError[];
}

// JWT types (extending from auth schema)
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// Database document base interface
export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Query builder types
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

// Import/Export types
export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeAttachments: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  filters?: TaskFilters;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: Array<{
    row: number;
    message: string;
  }>;
}

// Re-export commonly used types from schemas
import type { 
  Task, 
  TaskStatus, 
  TaskPriority, 
  Category, 
  User, 
  CreateTaskInput, 
  UpdateTaskInput, 
  CreateCategoryInput, 
  UpdateCategoryInput 
} from './zod/auth.schema';

export type {
  Task,
  TaskStatus,
  TaskPriority,
  Category,
  User,
  CreateTaskInput,
  UpdateTaskInput,
  CreateCategoryInput,
  UpdateCategoryInput,
};