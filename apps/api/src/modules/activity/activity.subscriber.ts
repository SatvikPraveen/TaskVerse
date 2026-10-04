// apps/api/src/modules/activity/activity.subscriber.ts
import mongoose from 'mongoose';

import { type DomainEventMap, type DomainEventName, domainEvents } from '@/events/domain-events';

import { Activity, type ActivityEntityType } from './activity.model';

const oid = (id: string) => new mongoose.Types.ObjectId(id);

interface Described {
  entityType: ActivityEntityType;
  entityId: string;
  summary: string;
  changes?: string[];
  metadata?: Record<string, unknown>;
}

const describe = (name: DomainEventName, payload: DomainEventMap[DomainEventName]): Described => {
  switch (name) {
    case 'task.created': {
      const p = payload as DomainEventMap['task.created'];
      return { entityType: 'task', entityId: p.taskId, summary: `created task "${p.title}"` };
    }
    case 'task.updated': {
      const p = payload as DomainEventMap['task.updated'];
      return {
        entityType: 'task',
        entityId: p.taskId,
        summary: `updated ${p.changes.join(', ') || 'task'} on "${p.title}"`,
        changes: p.changes,
      };
    }
    case 'task.status_changed': {
      const p = payload as DomainEventMap['task.status_changed'];
      return {
        entityType: 'task',
        entityId: p.taskId,
        summary: `moved "${p.title}" from ${p.oldStatus} to ${p.newStatus}`,
        changes: ['status'],
        metadata: { oldStatus: p.oldStatus, newStatus: p.newStatus },
      };
    }
    case 'task.assigned': {
      const p = payload as DomainEventMap['task.assigned'];
      return {
        entityType: 'task',
        entityId: p.taskId,
        summary: p.assignedTo ? `assigned "${p.title}"` : `unassigned "${p.title}"`,
        changes: ['assignedTo'],
        metadata: { assignedTo: p.assignedTo },
      };
    }
    case 'task.comment_added': {
      const p = payload as DomainEventMap['task.comment_added'];
      return { entityType: 'task', entityId: p.taskId, summary: `commented on "${p.title}"` };
    }
    case 'task.subtask_updated': {
      const p = payload as DomainEventMap['task.subtask_updated'];
      return {
        entityType: 'task',
        entityId: p.taskId,
        summary: `${p.isCompleted ? 'completed' : 'reopened'} a subtask of "${p.title}"`,
        metadata: { subtaskId: p.subtaskId, isCompleted: p.isCompleted },
      };
    }
    case 'task.deleted': {
      const p = payload as DomainEventMap['task.deleted'];
      return { entityType: 'task', entityId: p.taskId, summary: `deleted task "${p.title}"` };
    }
    case 'category.created': {
      const p = payload as DomainEventMap['category.created'];
      return { entityType: 'category', entityId: p.categoryId, summary: `created category "${p.name}"` };
    }
    case 'category.updated': {
      const p = payload as DomainEventMap['category.updated'];
      return {
        entityType: 'category',
        entityId: p.categoryId,
        summary: `updated category "${p.name}"`,
        changes: p.changes,
      };
    }
    case 'category.deleted': {
      const p = payload as DomainEventMap['category.deleted'];
      return { entityType: 'category', entityId: p.categoryId, summary: `deleted category "${p.name}"` };
    }
    default:
      return { entityType: 'task', entityId: '000000000000000000000000', summary: String(name) };
  }
};

/** Persists one Activity document per domain event. Idempotent to register. */
export const registerActivitySubscriber = (): (() => void) =>
  domainEvents.subscribeAll(async (payload, name) => {
    const described = describe(name, payload);
    await Activity.create({
      event: name,
      entityType: described.entityType,
      entityId: oid(described.entityId),
      actor: oid(payload.actorId),
      audience: payload.recipients.map(oid),
      summary: described.summary,
      changes: described.changes ?? [],
      metadata: described.metadata ?? {},
    });
  });
