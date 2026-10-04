// apps/web/src/api/tasks.api.ts
import { useMutation, useQuery, useQueryClient } from 'react-query';
import type {
  Comment,
  CommentInput,
  CreateTaskInput,
  PaginatedTasks,
  Task,
  TaskFiltersInput,
  TaskStats,
  UpdateTaskInput,
} from '@taskverse/types';

import { api } from './client';

export type { Task, TaskStats, Comment } from '@taskverse/types';

export type TaskFilters = Partial<TaskFiltersInput>;

const toQueryString = (filters: TaskFilters): string => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') params.append(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
};

export const tasksApi = {
  getTasks: (filters: TaskFilters = {}) => api.get<PaginatedTasks>(`/tasks${toQueryString(filters)}`),
  getTask: (taskId: string) => api.get<{ task: Task }>(`/tasks/${taskId}`),
  createTask: (data: CreateTaskInput) => api.post<{ task: Task }>('/tasks', data),
  updateTask: (taskId: string, data: UpdateTaskInput) =>
    api.put<{ task: Task }>(`/tasks/${taskId}`, data),
  deleteTask: (taskId: string) => api.delete(`/tasks/${taskId}`),
  getTaskStats: () => api.get<{ stats: TaskStats }>('/tasks/stats'),
  addComment: (taskId: string, data: CommentInput) =>
    api.post<{ comment: Comment }>(`/tasks/${taskId}/comments`, data),
  updateSubtask: (taskId: string, subtaskId: string, data: { isCompleted: boolean }) =>
    api.put<{ task: Task }>(`/tasks/${taskId}/subtasks/${subtaskId}`, data),
};

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (filters: TaskFilters) => [...taskKeys.lists(), filters] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
  stats: () => [...taskKeys.all, 'stats'] as const,
};

export const useTasks = (filters: TaskFilters = {}) =>
  useQuery(taskKeys.list(filters), () => tasksApi.getTasks(filters), {
    keepPreviousData: true,
    staleTime: 30 * 1000,
  });

export const useTask = (taskId: string | null) =>
  useQuery(taskKeys.detail(taskId ?? ''), () => tasksApi.getTask(taskId!), {
    enabled: !!taskId,
  });

export const useTaskStats = () =>
  useQuery(taskKeys.stats(), tasksApi.getTaskStats, { staleTime: 60 * 1000 });

const useInvalidateTasks = () => {
  const queryClient = useQueryClient();
  return (taskId?: string) => {
    queryClient.invalidateQueries(taskKeys.lists());
    queryClient.invalidateQueries(taskKeys.stats());
    if (taskId) queryClient.invalidateQueries(taskKeys.detail(taskId));
  };
};

export const useCreateTask = () => {
  const invalidate = useInvalidateTasks();
  return useMutation(tasksApi.createTask, { onSuccess: () => invalidate() });
};

export const useUpdateTask = () => {
  const invalidate = useInvalidateTasks();
  return useMutation(
    ({ taskId, data }: { taskId: string; data: UpdateTaskInput }) =>
      tasksApi.updateTask(taskId, data),
    { onSuccess: (_res, { taskId }) => invalidate(taskId) }
  );
};

export const useDeleteTask = () => {
  const invalidate = useInvalidateTasks();
  return useMutation(tasksApi.deleteTask, { onSuccess: () => invalidate() });
};

export const useAddComment = () => {
  const invalidate = useInvalidateTasks();
  return useMutation(
    ({ taskId, data }: { taskId: string; data: CommentInput }) => tasksApi.addComment(taskId, data),
    { onSuccess: (_res, { taskId }) => invalidate(taskId) }
  );
};

export const useUpdateSubtask = () => {
  const invalidate = useInvalidateTasks();
  return useMutation(
    ({ taskId, subtaskId, data }: { taskId: string; subtaskId: string; data: { isCompleted: boolean } }) =>
      tasksApi.updateSubtask(taskId, subtaskId, data),
    { onSuccess: (_res, { taskId }) => invalidate(taskId) }
  );
};
