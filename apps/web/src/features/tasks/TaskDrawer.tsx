// apps/web/src/features/tasks/TaskDrawer.tsx
import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  CalendarIcon, 
  ChatBubbleLeftIcon,
  PaperClipIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import type { Task } from '@/api/tasks.api';
import { useUpdateTask, useDeleteTask, useAddComment, useUpdateSubtask } from '@/api/tasks.api';
import { formatDate, formatTimeAgo } from '@/utils/date';
import Button from '@/components/Button';
import Input from '@/components/Input';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';

interface TaskDrawerProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions = [
  { value: 'todo', label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800' },
];

interface CommentForm {
  content: string;
}

export default function TaskDrawer({ task, isOpen, onClose }: TaskDrawerProps) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  
  const updateTaskMutation = useUpdateTask();
  const deleteTaskMutation = useDeleteTask();
  const addCommentMutation = useAddComment();
  const updateSubtaskMutation = useUpdateSubtask();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CommentForm>();

  if (!task) return null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId: task._id,
        data: { status: newStatus as any }
      });
      setEditingStatus(false);
      toast.success('Task status updated');
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await updateTaskMutation.mutateAsync({
        taskId: task._id,
        data: { priority: newPriority as any }
      });
      setEditingPriority(false);
      toast.success('Task priority updated');
    } catch (error) {
      toast.error('Failed to update priority');
    }
  };

  const handleDeleteTask = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await deleteTaskMutation.mutateAsync(task._id);
      onClose();
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
    }
  };

  const handleSubtaskToggle = async (subtaskId: string, isCompleted: boolean) => {
    try {
      await updateSubtaskMutation.mutateAsync({
        taskId: task._id,
        subtaskId,
        data: { isCompleted }
      });
    } catch (error) {
      toast.error('Failed to update subtask');
    }
  };

  const onCommentSubmit = async (data: CommentForm) => {
    try {
      await addCommentMutation.mutateAsync({
        taskId: task._id,
        data: { content: data.content }
      });
      reset();
      toast.success('Comment added');
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const currentStatus = statusOptions.find(s => s.value === task.status);
  const currentPriority = priorityOptions.find(p => p.value === task.priority);

  return (
    <Transition.Root show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-in-out duration-500"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in-out duration-500"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <Transition.Child
                as={Fragment}
                enter="transform transition ease-in-out duration-500 sm:duration-700"
                enterFrom="translate-x-full"
                enterTo="translate-x-0"
                leave="transform transition ease-in-out duration-500 sm:duration-700"
                leaveFrom="translate-x-0"
                leaveTo="translate-x-full"
              >
                <Dialog.Panel className="pointer-events-auto w-screen max-w-2xl">
                  <div className="flex h-full flex-col overflow-y-scroll bg-white py-6 shadow-xl">
                    {/* Header */}
                    <div className="px-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <Dialog.Title className="text-base font-semibold leading-6 text-gray-900">
                          Task Details
                        </Dialog.Title>
                        <div className="ml-3 flex h-7 items-center">
                          <button
                            type="button"
                            className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                            onClick={onClose}
                          >
                            <XMarkIcon className="h-6 w-6" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative mt-6 flex-1 px-4 sm:px-6 space-y-6">
                      {/* Title and Category */}
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">
                          {task.title}
                        </h1>
                        {task.category && (
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: task.category.color }}
                            />
                            <span className="text-sm text-gray-600">
                              {task.category.name}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Status and Priority */}
                      <div className="flex gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Status
                          </label>
                          {editingStatus ? (
                            <select
                              className="rounded-md border-gray-300 text-sm"
                              value={task.status}
                              onChange={(e) => handleStatusChange(e.target.value)}
                              onBlur={() => setEditingStatus(false)}
                              autoFocus
                            >
                              {statusOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingStatus(true)}
                              className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                currentStatus?.color
                              )}
                            >
                              {currentStatus?.label}
                              <PencilIcon className="ml-1 h-3 w-3" />
                            </button>
                          )}
                        </div>

                        <div>
                          <label className="text-sm font-medium text-gray-700 block mb-1">
                            Priority
                          </label>
                          {editingPriority ? (
                            <select
                              className="rounded-md border-gray-300 text-sm"
                              value={task.priority}
                              onChange={(e) => handlePriorityChange(e.target.value)}
                              onBlur={() => setEditingPriority(false)}
                              autoFocus
                            >
                              {priorityOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setEditingPriority(true)}
                              className={clsx(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                currentPriority?.color
                              )}
                            >
                              {currentPriority?.label}
                              <PencilIcon className="ml-1 h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {task.description && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Description
                          </h3>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {task.description}
                          </p>
                        </div>
                      )}

                      {/* Due Date */}
                      {task.dueDate && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <CalendarIcon className="h-4 w-4" />
                          <span>Due: {formatDate(task.dueDate, 'MMM d, yyyy')}</span>
                        </div>
                      )}

                      {/* Tags */}
                      {task.tags.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Tags</h3>
                          <div className="flex flex-wrap gap-1">
                            {task.tags.map(tag => (
                              <span
                                key={tag}
                                className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Subtasks */}
                      {task.subtasks.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            Subtasks ({task.subtasks.filter(s => s.isCompleted).length}/{task.subtasks.length})
                          </h3>
                          <div className="space-y-2">
                            {task.subtasks.map(subtask => (
                              <div key={subtask._id} className="flex items-center gap-3">
                                <button
                                  onClick={() => handleSubtaskToggle(subtask._id, !subtask.isCompleted)}
                                  className={clsx(
                                    'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center',
                                    subtask.isCompleted
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300 hover:border-gray-400'
                                  )}
                                >
                                  {subtask.isCompleted && (
                                    <CheckCircleIcon className="w-3 h-3 text-white" />
                                  )}
                                </button>
                                <span className={clsx(
                                  'text-sm',
                                  subtask.isCompleted ? 'text-gray-500 line-through' : 'text-gray-900'
                                )}>
                                  {subtask.title}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comments */}
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                          <ChatBubbleLeftIcon className="h-4 w-4" />
                          Comments ({task.comments.length})
                        </h3>
                        
                        {/* Add Comment */}
                        <form onSubmit={handleSubmit(onCommentSubmit)} className="mb-4">
                          <Input
                            placeholder="Add a comment..."
                            error={errors.content?.message}
                            {...register('content', { required: 'Comment cannot be empty' })}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            className="mt-2"
                            isLoading={addCommentMutation.isLoading}
                          >
                            Add Comment
                          </Button>
                        </form>

                        {/* Comments List */}
                        <div className="space-y-3">
                          {task.comments.map(comment => (
                            <div key={comment._id} className="flex gap-3">
                              {comment.author.avatar ? (
                                <img
                                  src={comment.author.avatar}
                                  alt={comment.author.username}
                                  className="w-8 h-8 rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-600">
                                    {comment.author.username[0].toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium text-gray-900">
                                    {comment.author.firstName || comment.author.username}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatTimeAgo(comment.createdAt)}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Attachments */}
                      {task.attachments.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <PaperClipIcon className="h-4 w-4" />
                            Attachments ({task.attachments.length})
                          </h3>
                          <div className="space-y-2">
                            {task.attachments.map(attachment => (
                              <a
                                key={attachment._id}
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50"
                              >
                                <PaperClipIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {attachment.originalName}
                                </span>
                                <span className="text-xs text-gray-500 ml-auto">
                                  {(attachment.size / 1024).toFixed(1)} KB
                                </span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="pt-6 border-t border-gray-200">
                        <div className="flex gap-3">
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<TrashIcon className="h-4 w-4" />}
                            onClick={handleDeleteTask}
                            isLoading={deleteTaskMutation.isLoading}
                          >
                            Delete Task
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
}