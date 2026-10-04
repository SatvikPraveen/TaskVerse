// apps/api/src/modules/tasks/task.events.ts
import { type DomainEventMap, domainEvents, uniqueRecipients } from '@/events/domain-events';

import type { ITask } from './task.model';

const idOf = (ref: unknown): string | undefined => {
  if (!ref) return undefined;
  if (typeof ref === 'string') return ref;
  const maybe = ref as { _id?: unknown; toString(): string };
  return maybe._id ? String(maybe._id) : ref.toString();
};

/** Base payload shared by all task events, derived from the document. */
export const taskEventBase = (task: ITask, actorId: string) => ({
  taskId: task._id.toString(),
  title: task.title,
  actorId,
  recipients: uniqueRecipients(idOf(task.createdBy), idOf(task.assignedTo), actorId),
  timestamp: new Date().toISOString(),
});

type TaskEventName = Extract<keyof DomainEventMap, `task.${string}`>;

export const publishTaskEvent = <K extends TaskEventName>(
  name: K,
  task: ITask,
  actorId: string,
  extra: Omit<DomainEventMap[K], keyof ReturnType<typeof taskEventBase>>
): Promise<void> =>
  domainEvents.publish(name, { ...taskEventBase(task, actorId), ...extra } as DomainEventMap[K]);
