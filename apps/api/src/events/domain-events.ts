// apps/api/src/events/domain-events.ts
//
// In-process, typed publish/subscribe bus for domain events. Controllers
// publish; the activity log, the Socket.IO bridge and tests subscribe.
// Keeping side effects behind events means a controller never knows (or
// has to be mocked for) who listens.
import { logger } from '@/config/logger';
import type { TaskStatus } from '@/modules/tasks/task.model';

export interface EventBase {
  /** User who caused the event. */
  actorId: string;
  /** Users who should be notified (creator, assignee); deduplicated. */
  recipients: string[];
  timestamp: string;
}

export interface TaskEventBase extends EventBase {
  taskId: string;
  title: string;
}

export interface DomainEventMap {
  'task.created': TaskEventBase & { task: unknown };
  'task.updated': TaskEventBase & { task: unknown; changes: string[] };
  'task.status_changed': TaskEventBase & { task: unknown; oldStatus: TaskStatus; newStatus: TaskStatus };
  'task.assigned': TaskEventBase & { task: unknown; assignedTo: string | null };
  'task.comment_added': TaskEventBase & { comment: unknown };
  'task.subtask_updated': TaskEventBase & { task: unknown; subtaskId: string; isCompleted: boolean };
  'task.deleted': TaskEventBase;
  'category.created': EventBase & { categoryId: string; name: string };
  'category.updated': EventBase & { categoryId: string; name: string; changes: string[] };
  'category.deleted': EventBase & { categoryId: string; name: string };
}

export type DomainEventName = keyof DomainEventMap;

export type Subscriber<K extends DomainEventName> = (
  payload: DomainEventMap[K],
  name: K
) => void | Promise<void>;

type AnySubscriber = (
  payload: DomainEventMap[DomainEventName],
  name: DomainEventName
) => void | Promise<void>;

class DomainEventBus {
  private readonly subscribers = new Map<DomainEventName | '*', Set<AnySubscriber>>();

  subscribe<K extends DomainEventName>(name: K, subscriber: Subscriber<K>): () => void {
    const set = this.subscribers.get(name) ?? new Set();
    set.add(subscriber as AnySubscriber);
    this.subscribers.set(name, set);
    return () => set.delete(subscriber as AnySubscriber);
  }

  /** Receives every event; used by the activity log and the socket bridge. */
  subscribeAll(subscriber: AnySubscriber): () => void {
    const set = this.subscribers.get('*') ?? new Set();
    set.add(subscriber);
    this.subscribers.set('*', set);
    return () => set.delete(subscriber);
  }

  /**
   * Publishes and waits for every subscriber. A failing subscriber is logged
   * and never propagates to the publisher, so a broken listener cannot fail
   * the HTTP request that triggered it.
   */
  async publish<K extends DomainEventName>(name: K, payload: DomainEventMap[K]): Promise<void> {
    const targeted = [...(this.subscribers.get(name) ?? [])];
    const global = [...(this.subscribers.get('*') ?? [])];
    const results = await Promise.allSettled(
      [...targeted, ...global].map(subscriber => Promise.resolve().then(() => subscriber(payload, name)))
    );
    for (const result of results) {
      if (result.status === 'rejected') {
        logger.error({ err: result.reason, event: name }, 'domain event subscriber failed');
      }
    }
  }

  /** Test helper. */
  clear(): void {
    this.subscribers.clear();
  }
}

export const domainEvents = new DomainEventBus();

export const uniqueRecipients = (...ids: Array<string | undefined | null>): string[] => [
  ...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)),
];
