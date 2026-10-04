// apps/web/src/features/tasks/CreateTaskForm.tsx
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import type { Category, CreateTaskInput, TaskPriority, TaskStatus } from '@taskverse/types';

import Button from '@/components/Button';
import Input from '@/components/Input';

interface CreateTaskFormProps {
  categories: Category[];
  onSubmit: (data: CreateTaskInput) => void;
  onCancel: () => void;
  isLoading: boolean;
}

interface TaskForm {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  startDate: string;
  estimatedHours: number | '';
  tags: string[];
  subtasks: Array<{ title: string; isCompleted: boolean }>;
}

const selectClass =
  'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

/** Interprets a yyyy-mm-dd input as the end of that day in local time. */
const toIsoEndOfDay = (date: string) => {
  const d = new Date(`${date}T23:59:59`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};
const toIsoStartOfDay = (date: string) => {
  const d = new Date(`${date}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
};

export default function CreateTaskForm({ categories, onSubmit, onCancel, isLoading }: CreateTaskFormProps) {
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
      estimatedHours: '',
      tags: [],
      subtasks: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'subtasks' });
  const tags = watch('tags');

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) setValue('tags', [...tags, tag]);
    setTagInput('');
  };

  const onFormSubmit = (data: TaskForm) => {
    onSubmit({
      title: data.title,
      description: data.description || undefined,
      status: data.status,
      priority: data.priority,
      category: data.category || undefined,
      dueDate: data.dueDate ? toIsoEndOfDay(data.dueDate) : undefined,
      startDate: data.startDate ? toIsoStartOfDay(data.startDate) : undefined,
      estimatedHours: data.estimatedHours === '' ? undefined : Number(data.estimatedHours),
      tags: data.tags,
      subtasks: data.subtasks.filter(s => s.title.trim()),
    });
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Input
        label="Title"
        placeholder="Enter task title"
        error={errors.title?.message}
        {...register('title', { required: 'Title is required', maxLength: { value: 200, message: 'Too long' } })}
      />

      <div>
        <label htmlFor="task-description" className="mb-2 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="task-description"
          rows={3}
          placeholder="What needs to be done?"
          className={selectClass}
          {...register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="task-status" className="mb-2 block text-sm font-medium text-gray-700">
            Status
          </label>
          <select id="task-status" className={selectClass} {...register('status')}>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label htmlFor="task-priority" className="mb-2 block text-sm font-medium text-gray-700">
            Priority
          </label>
          <select id="task-priority" className={selectClass} {...register('priority')}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="task-category" className="mb-2 block text-sm font-medium text-gray-700">
          Category
        </label>
        <select id="task-category" className={selectClass} {...register('category')}>
          <option value="">No category</option>
          {categories.map(category => (
            <option key={category._id} value={category._id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Input label="Start date" type="date" {...register('startDate')} />
        <Input label="Due date" type="date" {...register('dueDate')} />
        <Input
          label="Estimated hours"
          type="number"
          min="0"
          step="0.5"
          error={errors.estimatedHours?.message}
          {...register('estimatedHours', { min: { value: 0, message: 'Must be ≥ 0' } })}
        />
      </div>

      <div>
        <label htmlFor="task-tag-input" className="mb-2 block text-sm font-medium text-gray-700">
          Tags
        </label>
        <div className="mb-2 flex gap-2">
          <input
            id="task-tag-input"
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="Add a tag and press Enter"
            className={`${selectClass} flex-1`}
          />
          <Button type="button" variant="outline" size="sm" onClick={addTag}>
            Add
          </Button>
        </div>
        {tags.length > 0 && (
          <ul className="flex flex-wrap gap-1" aria-label="Selected tags">
            {tags.map(tag => (
              <li
                key={tag}
                className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => setValue('tags', tags.filter(t => t !== tag))}
                  className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-indigo-200"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="block text-sm font-medium text-gray-700">Subtasks</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<PlusIcon className="h-4 w-4" />}
            onClick={() => append({ title: '', isCompleted: false })}
          >
            Add subtask
          </Button>
        </div>
        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                aria-label={`Subtask ${index + 1} title`}
                placeholder="Subtask title"
                className={`${selectClass} flex-1`}
                {...register(`subtasks.${index}.title` as const)}
              />
              <Button type="button" variant="ghost" size="sm" aria-label="Remove subtask" onClick={() => remove(index)}>
                <XMarkIcon className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} fullWidth>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading} fullWidth>
          Create task
        </Button>
      </div>
    </form>
  );
}
