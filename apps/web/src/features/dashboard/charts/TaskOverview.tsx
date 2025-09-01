// apps/web/src/features/dashboard/charts/TasksOverview.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TaskStats } from '@/api/tasks.api';

interface TasksOverviewProps {
  stats?: TaskStats;
  isLoading: boolean;
}

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

const statusColors = {
  todo: '#6b7280',
  in_progress: '#3b82f6',
  completed: '#10b981',
  cancelled: '#ef4444',
};

export default function TasksOverview({ stats, isLoading }: TasksOverviewProps) {
  if (isLoading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <p>No task data available</p>
      </div>
    );
  }

  const data = Object.entries(stats)
    .filter(([key]) => key !== 'overdue')
    .map(([status, count]) => ({
      status: statusLabels[status as keyof typeof statusLabels],
      count,
      fill: statusColors[status as keyof typeof statusColors],
    }));

  const totalTasks = data.reduce((sum, item) => sum + item.count, 0);

  if (totalTasks === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <p className="text-lg">No tasks yet</p>
          <p className="text-sm">Create your first task to see statistics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis 
            dataKey="status" 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#ffffff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
          />
          <Bar 
            dataKey="count" 
            radius={[4, 4, 0, 0]}
            fill={(entry) => entry.fill}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}