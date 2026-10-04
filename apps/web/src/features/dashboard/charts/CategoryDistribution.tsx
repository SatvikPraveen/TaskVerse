// apps/web/src/features/dashboard/charts/CategoryDistribution.tsx
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';

import type { CategoryStats } from '@taskverse/types';

interface CategoryDistributionProps {
  stats?: CategoryStats[];
  isLoading: boolean;
}

export default function CategoryDistribution({ stats, isLoading }: CategoryDistributionProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center" aria-busy="true">
        <div className="animate-pulse">
          <div className="mx-auto mb-4 h-32 w-32 rounded-full bg-gray-200" />
          <div className="mx-auto h-3 w-24 rounded bg-gray-200" />
        </div>
      </div>
    );
  }

  const data = (stats ?? [])
    .filter(c => c.taskCount > 0)
    .map(c => ({ name: c.name, value: c.taskCount, color: c.color }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-center text-gray-500">
        <div>
          <p className="text-lg">{stats?.length ? 'No tasks in categories' : 'No categories yet'}</p>
          <p className="text-sm">
            {stats?.length
              ? 'Assign categories to tasks to see the distribution'
              : 'Create categories to organise your tasks'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <figure className="h-64">
      <figcaption className="sr-only">Share of tasks per category</figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={45}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map(entry => (
              <Cell key={entry.name} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ border: '1px solid #e5e7eb', borderRadius: 6 }}
            formatter={(value: number, name: string) => [`${value} task${value === 1 ? '' : 's'}`, name]}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </figure>
  );
}
