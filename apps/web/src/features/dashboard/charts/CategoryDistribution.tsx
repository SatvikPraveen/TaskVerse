// apps/web/src/features/dashboard/charts/CategoryDistribution.tsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { CategoryStats } from '@/api/categories.api';

interface CategoryDistributionProps {
  stats?: CategoryStats[];
  isLoading: boolean;
}

export default function CategoryDistribution({ stats, isLoading }: CategoryDistributionProps) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-32 h-32 bg-gray-200 rounded-full mb-4 mx-auto"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded w-24 mx-auto"></div>
            <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats || stats.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No categories yet</p>
          <p className="text-sm">Create categories to organize your tasks</p>
        </div>
      </div>
    );
  }

  // Filter categories with tasks
  const dataWithTasks = stats.filter(category => category.taskCount > 0);

  if (dataWithTasks.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No tasks in categories</p>
          <p className="text-sm">Assign categories to your tasks to see distribution</p>
        </div>
      </div>
    );
  }

  const data = dataWithTasks.map(category => ({
    name: category.name,
    value: category.taskCount,
    color: category.color,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium">{data.name}</span>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {data.value} task{data.value !== 1 ? 's' : ''}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <ul className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`item-${index}`} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">{entry.value}</span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="#ffffff"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}