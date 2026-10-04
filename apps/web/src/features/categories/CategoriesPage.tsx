// apps/web/src/features/categories/CategoriesPage.tsx
import { PencilIcon, PlusIcon, TagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { CreateCategoryInput, UpdateCategoryInput } from '@taskverse/types';

import {
  type Category,
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/api/categories.api';
import { getErrorMessage } from '@/api/client';
import Button from '@/components/Button';
import Modal, { ModalActions } from '@/components/Modal';

import CategoryForm from './CategoryForm';

function CategorySkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-4 w-4 rounded bg-gray-200" />
              <div className="h-6 w-32 rounded bg-gray-200" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-16 rounded bg-gray-200" />
              <div className="h-8 w-16 rounded bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function CategoriesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const { data, isLoading, error } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const categories = data?.data.categories ?? [];

  const handleCreate = async (input: CreateCategoryInput) => {
    try {
      await createMutation.mutateAsync(input);
      setShowCreate(false);
      toast.success('Category created');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create category'));
    }
  };

  const handleUpdate = async (input: UpdateCategoryInput) => {
    if (!editing) return;
    try {
      await updateMutation.mutateAsync({ categoryId: editing._id, data: input });
      setEditing(null);
      toast.success('Category updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update category'));
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMutation.mutateAsync(deleting._id);
      setDeleting(null);
      toast.success('Category deleted');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete category'));
    }
  };

  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>Error loading categories</p>
        <p className="mt-1 text-sm text-gray-500">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="mt-1 text-gray-600">Group related tasks and colour-code your work</p>
        </div>
        <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
          New Category
        </Button>
      </div>

      {isLoading ? (
        <CategorySkeleton />
      ) : categories.length === 0 ? (
        <div className="py-12 text-center">
          <TagIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden="true" />
          <p className="text-lg text-gray-700">No categories yet</p>
          <p className="mt-1 text-sm text-gray-500">Create one to start organising your tasks</p>
          <div className="mt-6">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreate(true)}>
              Create Category
            </Button>
          </div>
        </div>
      ) : (
        <ul role="list" className="space-y-4">
          {categories.map(category => (
            <li
              key={category._id}
              className="flex items-center justify-between rounded-lg bg-white p-6 shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span
                  className="h-4 w-4 shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-base font-medium text-gray-900">{category.name}</p>
                  {category.description && (
                    <p className="truncate text-sm text-gray-500">{category.description}</p>
                  )}
                </div>
                <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {category.taskCount ?? 0} task{(category.taskCount ?? 0) === 1 ? '' : 's'}
                </span>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PencilIcon className="h-4 w-4" />}
                  onClick={() => setEditing(category)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<TrashIcon className="h-4 w-4" />}
                  onClick={() => setDeleting(category)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Create Category" size="lg">
        <CategoryForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          isLoading={createMutation.isLoading}
        />
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Category" size="lg">
        {editing && (
          <CategoryForm
            initialData={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            isLoading={updateMutation.isLoading}
          />
        )}
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Category" size="sm">
        <p className="text-sm text-gray-600">
          Delete <span className="font-medium text-gray-900">{deleting?.name}</span>?
        </p>
        {(deleting?.taskCount ?? 0) > 0 && (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {deleting?.taskCount} task{deleting?.taskCount === 1 ? '' : 's'} will be left without a
            category. The tasks themselves are kept.
          </p>
        )}
        <ModalActions
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          confirmText="Delete"
          confirmVariant="danger"
          isLoading={deleteMutation.isLoading}
        />
      </Modal>
    </div>
  );
}
