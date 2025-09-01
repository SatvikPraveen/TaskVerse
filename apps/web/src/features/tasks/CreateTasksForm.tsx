// apps/web/src/features/tasks/CreateTaskForm.tsx
import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/Button';
import Input from '@/components/Input';
import type { Category } from '@/api/categories.api';
import { formatInputDate } from '@/utils/date';

interface CreateTaskFormProps {
  categories: Category[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface TaskForm {
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  dueDate: string;
  startDate: string;
  estimatedHours: number;
  tags: string[];
  subtasks: Array<{ title: string; isCompleted: boolean }>;
}

export default function CreateTaskForm({ 
  categories, 
  onSubmit, 
  onCancel, 
  isLoading 
}: CreateTaskFormProps) {
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TaskForm>({
    defaultValues: {
      title: '',
      description: '',
      status: 'todo',
      priority: 'medium',
      category: '',
      dueDate: '',
      startDate: '',
      estimatedHours: 0,
      tags: [],
      subtasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'subtasks',
  });

  const watchedTags = watch('tags');

  const handleAddTag = () => {
    if (tagInput.trim() && !watchedTags.includes(tagInput.trim())) {
      setValue('tags', [...watchedTags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setValue('tags', watchedTags.filter(tag => tag !== tagToRemove));
  };

  const handleAddSubtask = () => {
    append({ title: '', isCompleted: false });
  };

  const onFormSubmit = (data: TaskForm) => {
    const processedData = {
      ...data,
      estimatedHours: data.estimatedHours || undefined,
      dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : undefined,
      startDate: data.startDate ? new Date(data.startDate).toISOString() : undefined,
      category: data.category || undefined,
    };
    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      {/* Title */}
      <Input
        label="Title"
        placeholder="Enter task title"
        error={errors.title?.message}
        {...register('title', { required: 'Title is required' })}
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          rows={3}
          placeholder="Enter task description"
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          {...register('description')}
        />
      </div>

      {/* Status and Priority */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            {...register('status')}
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Priority
          </label>
          <select
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            {...register('priority')}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category
        </label>
        <select
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          {...register('category')}
        >
          <option value="">Select a category</option>
          {categories.map(category => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dates and Hours */}
      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Due Date"
          type="date"
          {...register('dueDate')}
        />
        
        <Input
          label="Start Date"
          type="date"
          {...register('startDate')}
        />

        <Input
          label="Estimated Hours"
          type="number"
          min="0"
          step="0.5"
          {...register('estimatedHours', { valueAsNumber: true })}
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="Add a tag"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTag}
          >
            Add
          </Button>
        </div>
        
        {watchedTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {watchedTags.map(tag => (
              <span
                key={tag}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-indigo-200"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Subtasks */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Subtasks
          </label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={handleAddSubtask}
          >
            Add Subtask
          </Button>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex gap-2 items-center">
              <input
                placeholder="Subtask title"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                {...register(`subtasks.${index}.title` as const, {
                  required: 'Subtask title is required'
                })}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
              >
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          fullWidth
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          fullWidth
        >
          Create Task
        </Button>
      </div>
    </form>
  );
}