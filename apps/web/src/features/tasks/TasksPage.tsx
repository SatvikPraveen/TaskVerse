// apps/web/src/features/tasks/TasksPage.tsx
import { useState } from 'react';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';
import { useTasks, useCreateTask } from '@/api/tasks.api';
import { useCategories } from '@/api/categories.api';
import Button from '@/components/Button';
import Modal from '@/components/Modal';
import TaskDrawer from './TaskDrawer';
import FiltersBar from './FiltersBar';
import TaskCard from './TaskCard';
import CreateTaskForm from './CreateTaskForm';
import type { Task } from '@/api/tasks.api';
import type { TaskFiltersInput } from '@taskverse/types';

export default function TasksPage() {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Partial<TaskFiltersInput>>({});

  const { data: tasksData, isLoading, error } = useTasks(filters);
  const { data: categoriesData } = useCategories();
  const createTaskMutation = useCreateTask();

  const tasks = tasksData?.data?.tasks || [];
  const categories = categoriesData?.data?.categories || [];

  const handleCreateTask = async (data: any) => {
    try {
      await createTaskMutation.mutateAsync(data);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600">
          <p>Error loading tasks</p>
          <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">
            Manage and organize your tasks
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setShowCreateModal(true)}
          >
            New Task
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <FiltersBar
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
        />
      )}

      {/* Tasks Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400">
            <PlusIcon className="h-12 w-12 mx-auto mb-4" />
            <p className="text-lg">No tasks found</p>
            <p className="text-sm text-gray-500 mt-1">
              {Object.keys(filters).length > 0 
                ? 'Try adjusting your filters or create a new task'
                : 'Create your first task to get started'
              }
            </p>
          </div>
          <div className="mt-6">
            <Button
              leftIcon={<PlusIcon className="h-4 w-4" />}
              onClick={() => setShowCreateModal(true)}
            >
              Create Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => (
            <TaskCard
              key={task._id}
              task={task}
              onClick={() => setSelectedTask(task)}
            />
          ))}
        </div>
      )}

      {/* Task Details Drawer */}
      <TaskDrawer
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />

      {/* Create Task Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Task"
        size="lg"
      >
        <CreateTaskForm
          categories={categories}
          onSubmit={handleCreateTask}
          onCancel={() => setShowCreateModal(false)}
          isLoading={createTaskMutation.isLoading}
        />
      </Modal>
    </div>
  );
}