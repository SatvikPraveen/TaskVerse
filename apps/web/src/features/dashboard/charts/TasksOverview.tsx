// apps/web/src/features/dashboard/charts/TasksOverview.tsx
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TaskStats, TaskStatus } from '@taskverse/types';

interface TasksOverviewProps {
  stats?: TaskStats;
  isLoading: boolean;
}

const STATUS_META: Array<{ key: TaskStatus; label: string; color: string }> = [
  { key: 'todo', label: 'To Do', color: '#6b7280' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'completed', label: 'Completed', color: '#10b981' },
  { key: 'cancelled', label: 'Cancelled', color: '#ef4444' },
];

export default function TasksOverview({ stats, isLoading }: TasksOverviewProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" aria-busy="true">
        <div className="w-48 animate-pulse space-y-3">
          <div className="h-3 rounded bg-gray-200" />
          <div className="h-3 w-5/6 rounded bg-gray-200" />
          <div className="h-3 w-4/6 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const data = STATUS_META.map(meta => ({ ...meta, count: stats?.[meta.key] ?? 0 }));
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (!stats || total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-gray-500">
        <div>
          <p className="text-lg">No tasks yet</p>
          <p className="text-sm">Create your first task to see statistics</p>
        </div>
      </div>
    );
  }

  return (
    <figure className="h-64">
      <figcaption className="sr-only">Number of tasks in each status</figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
          <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
            contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 6 }}
            formatter={(value: number) => [value, 'Tasks']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map(entry => (
              <Cell key={entry.key} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}
