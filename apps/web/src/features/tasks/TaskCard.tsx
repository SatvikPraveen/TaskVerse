// apps/web/src/features/tasks/TaskCard.tsx
import { CalendarIcon, ChatBubbleLeftIcon, PaperClipIcon } from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { Task } from '@/api/tasks.api';
import { formatDueDate } from '@/utils/date';

interface TaskCardProps {
  task: Task;
  onClick: () => void;
}

const statusColors = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const priorityColors = {
  low: 'border-l-gray-400',
  medium: 'border-l-yellow-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-400',
};

const statusLabels = {
  todo: 'To Do',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const dueDate = task.dueDate ? formatDueDate(task.dueDate) : null;
  const completedSubtasks = task.subtasks.filter(s => s.isCompleted).length;
  const totalSubtasks = task.subtasks.length;

  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-lg shadow-sm border-l-4 p-6 cursor-pointer hover:shadow-md transition-shadow',
        priorityColors[task.priority]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 truncate">
            {task.title}
          </h3>
          <span
            className={clsx(
              'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1',
              statusColors[task.status]
            )}
          >
            {statusLabels[task.status]}
          </span>
        </div>
        
        {task.category && (
          <div className="flex items-center gap-2 ml-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: task.category.color }}
            />
            <span className="text-sm text-gray-600 truncate max-w-20">
              {task.category.name}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Progress Bar (if has subtasks) */}
      {totalSubtasks > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedSubtasks}/{totalSubtasks}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-600 h-2 rounded-full transition-all"
              style={{ width: `${task.completionPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      {task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {task.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
            >
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-xs text-gray-500">
              +{task.tags.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {task.comments.length > 0 && (
            <div className="flex items-center gap-1">
              <ChatBubbleLeftIcon className="h-4 w-4" />
              <span>{task.comments.length}</span>
            </div>
          )}
          
          {task.attachments.length > 0 && (
            <div className="flex items-center gap-1">
              <PaperClipIcon className="h-4 w-4" />
              <span>{task.attachments.length}</span>
            </div>
          )}
        </div>

        {dueDate && (
          <div className="flex items-center gap-1">
            <CalendarIcon className="h-4 w-4 text-gray-400" />
            <span className={clsx('text-sm', dueDate.color)}>
              {dueDate.text}
            </span>
          </div>
        )}
      </div>

      {/* Assigned User */}
      {task.assignedTo && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
          {task.assignedTo.avatar ? (
            <img
              src={task.assignedTo.avatar}
              alt={task.assignedTo.username}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600">
                {task.assignedTo.username[0].toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-sm text-gray-600">
            {task.assignedTo.firstName || task.assignedTo.username}
          </span>
        </div>
      )}
    </div>
  );
}