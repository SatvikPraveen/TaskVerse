// apps/web/src/api/categories.api.ts
import { useMutation, useQuery, useQueryClient } from 'react-query';

import type {
  Category,
  CategoryStats,
  CreateCategoryInput,
  ReorderCategoriesInput,
  UpdateCategoryInput,
} from '@taskverse/types';

import { api } from './client';

export type { Category, CategoryStats } from '@taskverse/types';

export const categoriesApi = {
  getCategories: () => api.get<{ categories: Category[] }>('/categories'),
  getCategory: (categoryId: string) => api.get<{ category: Category }>(`/categories/${categoryId}`),
  createCategory: (data: CreateCategoryInput) => api.post<{ category: Category }>('/categories', data),
  updateCategory: (categoryId: string, data: UpdateCategoryInput) =>
    api.put<{ category: Category }>(`/categories/${categoryId}`, data),
  deleteCategory: (categoryId: string) => api.delete(`/categories/${categoryId}`),
  reorderCategories: (data: ReorderCategoriesInput) => api.put('/categories/reorder', data),
  getCategoryStats: () => api.get<{ stats: CategoryStats[] }>('/categories/stats'),
};

export const categoryKeys = {
  all: ['categories'] as const,
  list: () => [...categoryKeys.all, 'list'] as const,
  detail: (id: string) => [...categoryKeys.all, 'detail', id] as const,
  stats: () => [...categoryKeys.all, 'stats'] as const,
};

export const useCategories = () =>
  useQuery(categoryKeys.list(), categoriesApi.getCategories, { staleTime: 5 * 60 * 1000 });

export const useCategoryStats = () =>
  useQuery(categoryKeys.stats(), categoriesApi.getCategoryStats, { staleTime: 2 * 60 * 1000 });

const useInvalidateCategories = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries(categoryKeys.all);
  };
};

export const useCreateCategory = () => {
  const invalidate = useInvalidateCategories();
  return useMutation(categoriesApi.createCategory, { onSuccess: invalidate });
};

export const useUpdateCategory = () => {
  const invalidate = useInvalidateCategories();
  return useMutation(
    ({ categoryId, data }: { categoryId: string; data: UpdateCategoryInput }) =>
      categoriesApi.updateCategory(categoryId, data),
    { onSuccess: invalidate }
  );
};

export const useDeleteCategory = () => {
  const invalidate = useInvalidateCategories();
  return useMutation(categoriesApi.deleteCategory, { onSuccess: invalidate });
};

export const useReorderCategories = () => {
  const invalidate = useInvalidateCategories();
  return useMutation(categoriesApi.reorderCategories, { onSettled: invalidate });
};
