// apps/api/src/sockets/init.ts
import type { Server as SocketIOServer, Socket } from 'socket.io';

import { logger } from '@/config/logger';
import { type AuthUser, resolveUserFromToken } from '@/middleware/auth';
import { socketConnections } from '@/observability/metrics';

export interface AuthenticatedSocket extends Socket {
  user?: AuthUser;
}

let ioInstance: SocketIOServer | null = null;

/** The live Socket.IO server, or null when running without one (e.g. tests). */
export const getIO = (): SocketIOServer | null => ioInstance;

export const userRoom = (userId: string) => `user:${userId}`;
export const taskRoom = (taskId: string) => `task:${taskId}`;

export function initSocketIO(io: SocketIOServer): void {
  ioInstance = io;

  io.use(async (socket: AuthenticatedSocket, next) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ||
      socket.handshake.headers.authorization?.split(' ')[1];
    if (!token) return next(new Error('Authentication token required'));

    try {
      const user = await resolveUserFromToken(token);
      if (!user) return next(new Error('Authentication failed'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    logger.debug({ userId: user.id, socketId: socket.id }, 'socket connected');
    socket.join(userRoom(user.id));
    socketConnections.inc();

    socket.on('task:join', (taskId: unknown) => {
      if (typeof taskId === 'string') socket.join(taskRoom(taskId));
    });
    socket.on('task:leave', (taskId: unknown) => {
      if (typeof taskId === 'string') socket.leave(taskRoom(taskId));
    });

    socket.on('typing:start', (data: { taskId?: string }) => {
      if (!data?.taskId) return;
      socket.to(taskRoom(data.taskId)).emit('typing:start', {
        userId: user.id,
        username: user.username,
        taskId: data.taskId,
      });
    });
    socket.on('typing:stop', (data: { taskId?: string }) => {
      if (!data?.taskId) return;
      socket.to(taskRoom(data.taskId)).emit('typing:stop', { userId: user.id, taskId: data.taskId });
    });

    socket.on('disconnect', reason => {
      socketConnections.dec();
      logger.debug({ userId: user.id, socketId: socket.id, reason }, 'socket disconnected');
    });
  });

  logger.info('Socket.IO initialised');
}
