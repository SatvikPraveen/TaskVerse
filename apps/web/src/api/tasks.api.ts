// apps/web/src/api/tasks.api.ts
import { useMutation, useQuery, useQueryClient, useInfiniteQuery } from 'react-query';
import { api, ApiResponse, PaginatedResponse } from './client';
import type { CreateTaskInput, UpdateTaskInput, TaskFiltersInput, CommentInput } from '@taskverse/types';

// Types
export interface Task {
  _id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category?: {
    _id: string;
    name: string;
    color: string;
    icon?: string;
  };
  assignedTo?: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  createdBy: {
    _id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  dueDate?: string;
  startDate?: string;
  completedAt?: string;
  estimatedHours?: number;
  actualHours?: number;
  tags: string[];
  subtasks: Array<{
    _id: string;
    title: string;
    isCompleted: boolean;
    createdAt: string;
  }>;
  comments: Array<{
    _id: string;
    content: string;
    author: {
      _id: string;
      username: string;
      firstName?: string;
      lastName?: string;
      avatar?: string;
    };
    createdAt: string;
    updatedAt: string;
  }>;
  attachments: Array<{
    _id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
    uploadedBy: string;
    uploadedAt: string;
  }>;
  completionPercentage: number;
  isOverdue: boolean;
  isArchived: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskStats {
  todo: number;
  in_progress: number;
  completed: number;
  cancelled: number;
  overdue: number;
}

export interface Comment {
  _id: string;
  content: string;
  author: {
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  createdAt: string;
}

// API functions
export const tasksApi = {
  getTasks: (filters: Partial<TaskFiltersInput> = {}): Promise<PaginatedResponse<Task[]>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    return api.get(`/tasks?${params.toString()}`);
  },

  getTask: (taskId: string): Promise<ApiResponse<{ task: Task }>> =>
    api.get(`/tasks/${taskId}`),

  createTask: (data: CreateTaskInput): Promise<ApiResponse<{ task: Task }>> =>
    api.post('/tasks', data),

  updateTask: (taskId: string, data: Partial<UpdateTaskInput>): Promise<ApiResponse<{ task: Task }>> =>
    api.put(`/tasks/${taskId}`, data),

  deleteTask: (taskId: string): Promise<ApiResponse> =>
    api.delete(`/tasks/${taskId}`),

  getTaskStats: (): Promise<ApiResponse<{ stats: TaskStats }>> =>
    api.get('/tasks/stats'),

  addComment: (taskId: string, data: CommentInput): Promise<ApiResponse<{ comment: Comment }>> =>
    api.post(`/tasks/${taskId}/comments`, data),

  updateSubtask: (taskId: string, subtaskId: string, data: { isCompleted: boolean }): Promise<ApiResponse<{ task: Task }>> =>
    api.put(`/tasks/${taskId}/subtasks/${subtaskId}`, data),
};

// Query keys
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: Partial<TaskFiltersInput>) => [...taskKeys.lists(), { filters }] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
};

// React Query hooks
export const useTasks = (filters: Partial<TaskFiltersInput> = {}) => {
  return useQuery(
    taskKeys.list(filters),
    () => tasksApi.getTasks(filters),
    {
      keepPreviousData: true,
      staleTime: 30 * 1000, // 30 seconds
    }
  );
};

export const useTask = (taskId: string, enabled = true) => {
  return useQuery(
    taskKeys.detail(taskId),
    () => tasksApi.getTask(taskId),
    {
      enabled: enabled && !!taskId,
    }
  );
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation(tasksApi.createTask, {
    onSuccess: () => {
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.stats());
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ taskId, data }: { taskId: string; data: Partial<UpdateTaskInput> }) =>
      tasksApi.updateTask(taskId, data),
    {
      onSuccess: (response, { taskId }) => {
        queryClient.invalidateQueries(taskKeys.lists());
        queryClient.invalidateQueries(taskKeys.detail(taskId));
        queryClient.invalidateQueries(taskKeys.stats());
      },
    }
  );
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  
  return useMutation(tasksApi.deleteTask, {
    onSuccess: () => {
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.stats());
    },
  });
};

export const useTaskStats = () => {
  return useQuery(
    taskKeys.stats(),
    tasksApi.getTaskStats,
    {
      staleTime: 60 * 1000, // 1 minute
    }
  );
};

export const useAddComment = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ taskId, data }: { taskId: string; data: CommentInput }) =>
      tasksApi.addComment(taskId, data),
    {
      onSuccess: (response, { taskId }) => {
        queryClient.invalidateQueries(taskKeys.detail(taskId));
      },
    }
  );
};

export const useUpdateSubtask = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ taskId, subtaskId, data }: { taskId: string; subtaskId: string; data: { isCompleted: boolean } }) =>
      tasksApi.updateSubtask(taskId, subtaskId, data),
    {
      onSuccess: (response, { taskId }) => {
        queryClient.invalidateQueries(taskKeys.detail(taskId));
        queryClient.invalidateQueries(taskKeys.lists());
        queryClient.invalidateQueries(taskKeys.stats());
      },
    }
  );
};