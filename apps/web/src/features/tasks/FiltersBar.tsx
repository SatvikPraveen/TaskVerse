// apps/web/src/features/tasks/FiltersBar.tsx
import { XMarkIcon } from '@heroicons/react/24/outline';

import type { TaskFilters } from '@/api/tasks.api';
import type { Category, TaskPriority, TaskSortBy, TaskStatus } from '@taskverse/types';

interface FiltersBarProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  categories: Category[];
}

const statusOptions: Array<{ value: TaskStatus; label: string }> = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions: Array<{ value: TaskPriority; label: string }> = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const sortOptions: Array<{ value: TaskSortBy; label: string }> = [
  { value: 'position', label: 'Position' },
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'title', label: 'Title' },
];

const selectClass =
  'block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm';

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function FiltersBar({ filters, onFiltersChange, categories }: FiltersBarProps) {
  const update = <K extends keyof TaskFilters>(key: K, value: TaskFilters[K] | '' | undefined) => {
    // Any filter change resets to page 1.
    const next: TaskFilters = { ...filters };
    delete next.page;
    if (value === '' || value === undefined || value === false) delete next[key];
    else next[key] = value as TaskFilters[K];
    onFiltersChange(next);
  };

  const hasFilters = Object.entries(filters).some(([k, v]) => k !== 'page' && v !== undefined && v !== '');

  return (
    <section className="rounded-lg border bg-white p-4 shadow-sm" aria-label="Task filters">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-900">Filters</h2>
        {hasFilters && (
          <button
            type="button"
            onClick={() => onFiltersChange({})}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-500"
          >
            <XMarkIcon className="h-4 w-4" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Field id="filter-search" label="Search">
          <input
            id="filter-search"
            type="search"
            placeholder="Search tasks…"
            value={filters.search ?? ''}
            onChange={e => update('search', e.target.value)}
            className={selectClass}
          />
        </Field>

        <Field id="filter-status" label="Status">
          <select
            id="filter-status"
            value={filters.status ?? ''}
            onChange={e => update('status', e.target.value as TaskStatus | '')}
            className={selectClass}
          >
            <option value="">All statuses</option>
            {statusOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="filter-priority" label="Priority">
          <select
            id="filter-priority"
            value={filters.priority ?? ''}
            onChange={e => update('priority', e.target.value as TaskPriority | '')}
            className={selectClass}
          >
            <option value="">All priorities</option>
            {priorityOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="filter-category" label="Category">
          <select
            id="filter-category"
            value={filters.category ?? ''}
            onChange={e => update('category', e.target.value)}
            className={selectClass}
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="filter-sort" label="Sort by">
          <select
            id="filter-sort"
            value={filters.sortBy ?? 'position'}
            onChange={e => update('sortBy', e.target.value as TaskSortBy)}
            className={selectClass}
          >
            {sortOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field id="filter-order" label="Order">
          <select
            id="filter-order"
            value={filters.sortOrder ?? 'asc'}
            onChange={e => update('sortOrder', e.target.value as 'asc' | 'desc')}
            className={selectClass}
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </Field>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-200 pt-4 md:grid-cols-3">
        <Field id="filter-due-after" label="Due after">
          <input
            id="filter-due-after"
            type="date"
            value={filters.dueAfter ? filters.dueAfter.slice(0, 10) : ''}
            onChange={e => update('dueAfter', e.target.value ? `${e.target.value}T00:00:00.000Z` : '')}
            className={selectClass}
          />
        </Field>
        <Field id="filter-due-before" label="Due before">
          <input
            id="filter-due-before"
            type="date"
            value={filters.dueBefore ? filters.dueBefore.slice(0, 10) : ''}
            onChange={e => update('dueBefore', e.target.value ? `${e.target.value}T23:59:59.999Z` : '')}
            className={selectClass}
          />
        </Field>
        <Field id="filter-tags" label="Tags (comma separated)">
          <input
            id="filter-tags"
            type="text"
            placeholder="urgent, research"
            value={filters.tags ?? ''}
            onChange={e => update('tags', e.target.value)}
            className={selectClass}
          />
        </Field>
      </div>

      <div className="mt-4 flex items-center border-t border-gray-200 pt-4">
        <input
          id="filter-archived"
          type="checkbox"
          checked={filters.archived ?? false}
          onChange={e => update('archived', e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="filter-archived" className="ml-2 block text-sm text-gray-700">
          Show archived tasks
        </label>
      </div>
    </section>
  );
}
