// apps/web/src/features/tasks/TasksPage.tsx
import { FunnelIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import type { CreateTaskInput, TaskPriority, TaskStatus } from '@taskverse/types';

import { useCategories } from '@/api/categories.api';
import { getErrorMessage } from '@/api/client';
import { type TaskFilters, useCreateTask, useTasks } from '@/api/tasks.api';
import Button from '@/components/Button';
import Modal from '@/components/Modal';

import CreateTaskForm from './CreateTaskForm';
import FiltersBar from './FiltersBar';
import TaskCard from './TaskCard';
import TaskDrawer from './TaskDrawer';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'completed', 'cancelled'];
const PRIORITIES: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];

export default function TasksPage() {
  const [searchParams] = useSearchParams();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const initialFilters = useMemo<TaskFilters>(() => {
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    return {
      ...(status && STATUSES.includes(status as TaskStatus) && { status: status as TaskStatus }),
      ...(priority &&
        PRIORITIES.includes(priority as TaskPriority) && { priority: priority as TaskPriority }),
    };
  }, [searchParams]);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);

  const { data: tasksData, isLoading, error } = useTasks(filters);
  const { data: categoriesData } = useCategories();
  const createTaskMutation = useCreateTask();

  const tasks = tasksData?.data.tasks ?? [];
  const pagination = tasksData?.data.pagination;
  const categories = categoriesData?.data.categories ?? [];
  const selectedTask = tasks.find(t => t._id === selectedTaskId) ?? null;

  const handleCreateTask = async (input: CreateTaskInput) => {
    try {
      await createTaskMutation.mutateAsync(input);
      setShowCreateModal(false);
      toast.success('Task created');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create task'));
    }
  };

  if (error) {
    return (
      <div className="py-12 text-center text-red-600">
        <p>Error loading tasks</p>
        <p className="mt-1 text-sm text-gray-500">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-gray-600">
            {pagination ? `${pagination.total} task${pagination.total === 1 ? '' : 's'}` : 'Manage your work'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<FunnelIcon className="h-4 w-4" />}
            onClick={() => setShowFilters(v => !v)}
            aria-expanded={showFilters}
          >
            Filters
          </Button>
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
            New Task
          </Button>
        </div>
      </div>

      {showFilters && (
        <FiltersBar filters={filters} onFiltersChange={setFilters} categories={categories} />
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-lg bg-white p-6 shadow">
              <div className="mb-4 h-4 w-3/4 rounded bg-gray-200" />
              <div className="mb-2 h-3 w-full rounded bg-gray-200" />
              <div className="h-3 w-2/3 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-12 text-center">
          <PlusIcon className="mx-auto mb-4 h-12 w-12 text-gray-400" aria-hidden="true" />
          <p className="text-lg text-gray-700">No tasks found</p>
          <p className="mt-1 text-sm text-gray-500">
            {Object.keys(filters).length > 0
              ? 'Try adjusting your filters or create a new task'
              : 'Create your first task to get started'}
          </p>
          <div className="mt-6">
            <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => setShowCreateModal(true)}>
              Create Task
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map(task => (
            <TaskCard key={task._id} task={task} onClick={() => setSelectedTaskId(task._id)} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="flex items-center justify-between" aria-label="Pagination">
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasPrev}
            onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
          >
            Previous
          </Button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={!pagination.hasNext}
            onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
          >
            Next
          </Button>
        </nav>
      )}

      <TaskDrawer task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTaskId(null)} />

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
