// apps/web/src/hooks/useSocket.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from 'react-query';
import { io, type Socket } from 'socket.io-client';

import { taskKeys } from '@/api/tasks.api';
import { tokenStorage } from '@/store/tokens';
import type { TaskSocketEvents } from '@taskverse/types';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '/';

const STATUS_LABEL: Record<string, string> = {
  todo: 'moved to To Do',
  in_progress: 'started',
  completed: 'completed',
  cancelled: 'cancelled',
};

/**
 * Maintains one authenticated Socket.IO connection per signed-in user and
 * translates server-side task events into React Query cache invalidations.
 */
export const useSocket = (userId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const token = tokenStorage.getAccessToken();
    if (!userId || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    const invalidate = (taskId?: string) => {
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.stats());
      if (taskId) queryClient.invalidateQueries(taskKeys.detail(taskId));
    };
    const isSomeoneElse = (actorId: string) => actorId !== userId;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', error => {
      if (error.message.toLowerCase().includes('auth')) {
        toast.error('Real-time connection rejected. Please sign in again.');
      }
    });

    socket.on('task:created', (data: TaskSocketEvents['task:created']) => {
      invalidate();
      if (isSomeoneElse(data.actorId)) toast.success(`New task: ${data.task.title}`);
    });
    socket.on('task:updated', (data: TaskSocketEvents['task:updated']) => {
      invalidate(data.taskId);
      if (isSomeoneElse(data.actorId)) toast(`Task updated: ${data.task.title}`, { icon: '✏️' });
    });
    socket.on('task:status_changed', (data: TaskSocketEvents['task:status_changed']) => {
      invalidate(data.taskId);
      if (isSomeoneElse(data.actorId)) {
        toast(`${data.task.title} ${STATUS_LABEL[data.newStatus] ?? data.newStatus}`);
      }
    });
    socket.on('task:assigned', (data: TaskSocketEvents['task:assigned']) => {
      invalidate(data.taskId);
      if (data.assignedTo === userId && isSomeoneElse(data.actorId)) {
        toast.success(`You were assigned: ${data.task.title}`);
      }
    });
    socket.on('task:comment_added', (data: TaskSocketEvents['task:comment_added']) => {
      invalidate(data.taskId);
      if (isSomeoneElse(data.actorId)) {
        toast(`New comment from ${data.comment.author.username}`, { icon: '💬' });
      }
    });
    socket.on('task:subtask_updated', (data: TaskSocketEvents['task:subtask_updated']) => {
      invalidate(data.taskId);
    });
    socket.on('task:deleted', (data: TaskSocketEvents['task:deleted']) => {
      invalidate(data.taskId);
      if (isSomeoneElse(data.actorId)) toast('A task was deleted', { icon: '🗑️' });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [userId, queryClient]);

  const joinTaskRoom = useCallback((taskId: string) => {
    socketRef.current?.emit('task:join', taskId);
  }, []);
  const leaveTaskRoom = useCallback((taskId: string) => {
    socketRef.current?.emit('task:leave', taskId);
  }, []);

  return { isConnected, joinTaskRoom, leaveTaskRoom };
};
