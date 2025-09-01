// apps/web/src/features/categories/CategoriesPage.tsx
import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory, useReorderCategories } from '@/api/categories.api';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Button from '@/components/Button';
import Modal, { ModalActions } from '@/components/Modal';
import CategoryForm from './CategoryForm';
import type { Category } from '@/api/categories.api';
import toast from 'react-hot-toast';

export default function CategoriesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const { data: categoriesData, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const reorderMutation = useReorderCategories();

  const categories = categoriesData?.data?.categories || [];

  const handleCreateCategory = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setShowCreateModal(false);
      toast.success('Category created successfully');
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleUpdateCategory = async (data: any) => {
    if (!editingCategory) return;
    
    try {
      await updateMutation.mutateAsync({
        categoryId: editingCategory._id,
        data,
      });
      setEditingCategory(null);
      toast.success('Category updated successfully');
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    
    try {
      await deleteMutation.mutateAsync(deletingCategory._id);
      setDeletingCategory(null);
      toast.success('Category deleted successfully');
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const reorderedCategories = Array.from(categories);
    const [reorderedItem] = reorderedCategories.splice(result.source.index, 1);
    reorderedCategories.splice(result.destination.index, 0, reorderedItem);

    // Update sort orders
    const reorderData = {
      categories: reorderedCategories.map((category, index) => ({
        id: category._id,
        sortOrder: index,
      })),
    };

    reorderMutation.mutate(reorderData);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete the category "{deletingCategory?.name}"?
            This action cannot be undone.
          </p>
          {(deletingCategory?.taskCount || 0) > 0 && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-sm text-amber-800">
                This category has {deletingCategory?.taskCount} task{(deletingCategory?.taskCount || 0) !== 1 ? 's' : ''}. 
                Deleting it will remove the category from those tasks.
              </p>
            </div>
          )}
        </div>
        
        <ModalActions
          onCancel={() => setDeletingCategory(null)}
          onConfirm={handleDeleteCategory}
          confirmText="Delete"
          confirmVariant="danger"
          isLoading={deleteMutation.isLoading}
        />
      </Modal>
    </div>
  );
} className="flex items-center justify-between">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-48"></div>
          </div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <div className="h-6 bg-gray-200 rounded w-32"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-600 mt-1">
            Organize your tasks with categories
          </p>
        </div>
        
        <Button
          leftIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => setShowCreateModal(true)}
        >
          New Category
        </Button>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <PlusIcon className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg">No categories yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Create your first category to organize your tasks
            </p>
          </div>
          <div className="mt-6">
            <Button
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Category
            </Button>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="categories">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {categories.map((category, index) => (
                  <Draggable
                    key={category._id}
                    draggableId={category._id}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-white rounded-lg shadow-sm border p-6 ${
                          snapshot.isDragging ? 'shadow-lg' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab hover:cursor-grabbing"
                            >
                              <Bars3Icon className="h-5 w-5 text-gray-400" />
                            </div>
                            
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            
                            <div>
                              <h3 className="text-lg font-medium text-gray-900">
                                {category.name}
                              </h3>
                              {category.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {category.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-500">
                              {category.taskCount || 0} task{(category.taskCount || 0) !== 1 ? 's' : ''}
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<PencilIcon className="h-4 w-4" />}
                                onClick={() => setEditingCategory(category)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<TrashIcon className="h-4 w-4" />}
                                onClick={() => setDeletingCategory(category)}
                              >
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {category.icon && (
                          <div className="mt-2 text-sm text-gray-500">
                            Icon: {category.icon}
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* Create Category Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Category"
      >
        <CategoryForm
          onSubmit={handleCreateCategory}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createMutation.isLoading}
        />
      </Modal>

      {/* Edit Category Modal */}
      <Modal
        isOpen={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        title="Edit Category"
      >
        {editingCategory && (
          <CategoryForm
            initialData={editingCategory}
            onSubmit={handleUpdateCategory}
            onCancel={() => setEditingCategory(null)}
            isLoading={updateMutation.isLoading}
          />
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        title="Delete Category"
      >
        <div