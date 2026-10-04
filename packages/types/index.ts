// File: packages/types/index.ts
//
// Single source of truth for the TaskVerse API contract. The API validates
// request bodies with these schemas and the web client types its calls with
// the inferred types, so the two cannot drift silently.

export * from './zod/common.schema';
export * from './zod/auth.schema';
export * from './zod/category.schema';
export * from './zod/task.schema';

import type { Pagination } from './zod/common.schema';
import type { Task, TaskStatus } from './zod/task.schema';

/** Shape of GET /api/tasks. */
export interface PaginatedTasks {
  tasks: Task[];
  pagination: Pagination;
}

/** Real-time events pushed by the API over Socket.IO. */
export interface TaskEventPayload {
  taskId: string;
  actorId: string;
  timestamp: string;
}

export interface TaskSocketEvents {
  'task:created': TaskEventPayload & { task: Task };
  'task:updated': TaskEventPayload & { task: Task; changes: string[] };
  'task:status_changed': TaskEventPayload & {
    task: Task;
    oldStatus: TaskStatus;
    newStatus: TaskStatus;
  };
  'task:assigned': TaskEventPayload & { task: Task; assignedTo: string };
  'task:comment_added': TaskEventPayload & { comment: Task['comments'][number] };
  'task:subtask_updated': TaskEventPayload & { task: Task };
  'task:deleted': TaskEventPayload;
}
