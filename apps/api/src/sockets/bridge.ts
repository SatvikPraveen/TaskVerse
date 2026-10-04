// apps/api/src/sockets/bridge.ts
import { type DomainEventName, domainEvents } from '@/events/domain-events';

import { getIO, taskRoom, userRoom } from './init';

/** Client-facing event names use a colon; internal ones use a dot. */
export const toClientEventName = (name: DomainEventName): string => name.replace('.', ':');

/**
 * Forwards every domain event to the Socket.IO server. Recipients receive it
 * in their personal room; task events additionally reach anyone viewing the
 * task. Socket.IO deduplicates sockets present in several target rooms.
 */
export const registerSocketBridge = (): (() => void) =>
  domainEvents.subscribeAll((payload, name) => {
    const io = getIO();
    if (!io) return;
    const rooms = payload.recipients.map(userRoom);
    if ('taskId' in payload) rooms.push(taskRoom(payload.taskId));
    io.to(rooms).emit(toClientEventName(name), payload);
  });
