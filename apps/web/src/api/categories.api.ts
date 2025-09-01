// apps/web/src/api/categories.api.ts
import { useMutation, useQuery, useQueryClient } from 'react-query';
import { api, ApiResponse } from './client';
import type { CreateCategoryInput, UpdateCategoryInput, ReorderCategoriesInput } from '@taskverse/types';

// Types
export interface Category {
  _id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  createdBy: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
  taskCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryStats {
  _id: string;
  name: string;
  color: string;
  taskCount: number;
  completedTasks: number;
}

// API functions
export const categoriesApi = {
  getCategories: (): Promise<ApiResponse<{ categories: Category[] }>> =>
    api.get('/categories'),

  getCategory: (categoryId: string): Promise<ApiResponse<{ category: Category }>> =>
    api.get(`/categories/${categoryId}`),

  createCategory: (data: CreateCategoryInput): Promise<ApiResponse<{ category: Category }>> =>
    api.post('/categories', data),

  updateCategory: (categoryId: string, data: UpdateCategoryInput): Promise<ApiResponse<{ category: Category }>> =>
    api.put(`/categories/${categoryId}`, data),

  deleteCategory: (categoryId: string): Promise<ApiResponse> =>
    api.delete(`/categories/${categoryId}`),

  reorderCategories: (data: ReorderCategoriesInput): Promise<ApiResponse> =>
    api.put('/categories/reorder', data),

  getCategoryStats: (): Promise<ApiResponse<{ stats: CategoryStats[] }>> =>
    api.get('/categories/stats'),
};

// Query keys
export const categoryKeys = {
  all: ['categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: () => [...categoryKeys.lists()] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (id: string) => [...categoryKeys.details(), id] as const,
  stats: () => [...categoryKeys.all, 'stats'] as const,
};

// React Query hooks
export const useCategories = () => {
  return useQuery(
    categoryKeys.list(),
    categoriesApi.getCategories,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
    }
  );
};

export const useCategory = (categoryId: string, enabled = true) => {
  return useQuery(
    categoryKeys.detail(categoryId),
    () => categoriesApi.getCategory(categoryId),
    {
      enabled: enabled && !!categoryId,
    }
  );
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation(categoriesApi.createCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries(categoryKeys.lists());
      queryClient.invalidateQueries(categoryKeys.stats());
    },
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation(
    ({ categoryId, data }: { categoryId: string; data: UpdateCategoryInput }) =>
      categoriesApi.updateCategory(categoryId, data),
    {
      onSuccess: (response, { categoryId }) => {
        queryClient.invalidateQueries(categoryKeys.lists());
        queryClient.invalidateQueries(categoryKeys.detail(categoryId));
        queryClient.invalidateQueries(categoryKeys.stats());
      },
    }
  );
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation(categoriesApi.deleteCategory, {
    onSuccess: () => {
      queryClient.invalidateQueries(categoryKeys.lists());
      queryClient.invalidateQueries(categoryKeys.stats());
    },
  });
};

export const useReorderCategories = () => {
  const queryClient = useQueryClient();
  
  return useMutation(categoriesApi.reorderCategories, {
    onMutate: async (newOrder: ReorderCategoriesInput) => {
      // Optimistically update the cache
      await queryClient.cancelQueries(categoryKeys.lists());
      
      const previousCategories = queryClient.getQueryData(categoryKeys.list());
      
      if (previousCategories) {
        // Update cache with new order
        queryClient.setQueryData(categoryKeys.list(), (old: any) => {
          if (old?.data?.categories) {
            const categories = [...old.data.categories];
            newOrder.categories.forEach(({ id, sortOrder }) => {
              const category = categories.find(c => c._id === id);
              if (category) {
                category.sortOrder = sortOrder;
              }
            });
            // Sort by new order
            categories.sort((a, b) => a.sortOrder - b.sortOrder);
            return { ...old, data: { ...old.data, categories } };
          }
          return old;
        });
      }
      
      return { previousCategories };
    },
    onError: (err, newOrder, context) => {
      // Revert on error
      if (context?.previousCategories) {
        queryClient.setQueryData(categoryKeys.list(), context.previousCategories);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(categoryKeys.lists());
    },
  });
};

export const useCategoryStats = () => {
  return useQuery(
    categoryKeys.stats(),
    categoriesApi.getCategoryStats,
    {
      staleTime: 2 * 60 * 1000, // 2 minutes
    }
  );
};