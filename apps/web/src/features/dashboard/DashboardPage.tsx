// apps/web/src/features/dashboard/DashboardPage.tsx
import { useTaskStats } from '@/api/tasks.api';
import { useCategoryStats } from '@/api/categories.api';
import { useAuthStore } from '@/store/auth.store';
import { 
  CheckCircleIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/Button';
import { Link } from 'react-router-dom';
import TasksOverview from './charts/TasksOverview';
import CategoryDistribution from './charts/CategoryDistribution';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data: taskStatsData, isLoading: taskStatsLoading } = useTaskStats();
  const { data: categoryStatsData, isLoading: categoryStatsLoading } = useCategoryStats();

  const taskStats = taskStatsData?.data?.stats;
  const categoryStats = categoryStatsData?.data?.stats;

  const stats = [
    {
      name: 'Active Tasks',
      value: (taskStats?.todo || 0) + (taskStats?.in_progress || 0),
      icon: ClockIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      name: 'Completed',
      value: taskStats?.completed || 0,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      name: 'Overdue',
      value: taskStats?.overdue || 0,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.firstName || user?.username}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your tasks today.
          </p>
        </div>
        
        <Link to="/tasks">
          <Button leftIcon={<PlusIcon className="h-4 w-4" />}>
            New Task
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`p-3 rounded-md ${stat.bgColor}`}>
                    <stat.icon
                      className={`h-6 w-6 ${stat.color}`}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.name}
                    </dt>
                    <dd className="text-3xl font-semibold text-gray-900">
                      {taskStatsLoading ? (
                        <div className="animate-pulse bg-gray-200 h-8 w-12 rounded"></div>
                      ) : (
                        stat.value
                      )}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tasks Overview Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tasks Overview
          </h3>
          <TasksOverview stats={taskStats} isLoading={taskStatsLoading} />
        </div>

        {/* Category Distribution Chart */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tasks by Category
          </h3>
          <CategoryDistribution stats={categoryStats} isLoading={categoryStatsLoading} />
        </div>
      </div>

      {/* Recent Activity (placeholder for future implementation) */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="text-center py-12">
            <div className="text-gray-400">
              <ClockIcon className="h-12 w-12 mx-auto mb-4" />
              <p className="text-sm">Recent activity will appear here</p>
              <p className="text-xs text-gray-500 mt-1">
                Task updates, comments, and completions
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/tasks?status=todo"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-indigo-600">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    View To-Do Tasks
                  </span>
                </div>
              </div>
            </Link>

            <Link
              to="/tasks?status=in_progress"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-blue-600">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    In Progress
                  </span>
                </div>
              </div>
            </Link>

            <Link
              to="/categories"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-purple-600">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Manage Categories
                  </span>
                </div>
              </div>
            </Link>

            <Link
              to="/tasks"
              className="relative rounded-lg border border-gray-300 bg-white px-6 py-4 shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 text-green-600">
                  <PlusIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-gray-900">
                    Create New Task
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}