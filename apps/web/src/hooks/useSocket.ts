// apps/web/src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from 'react-query';
import { taskKeys } from '@/api/tasks.api';
import { categoryKeys } from '@/api/categories.api';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export const useSocket = (userId?: string) => {
  const socketRef = useRef<Socket | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) {
      // Disconnect if no user
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Get access token for authentication
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    // Create socket connection
    const socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('✅ Connected to server');
      socket.emit('user:online');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔥 Connection error:', error);
      if (error.message.includes('Authentication')) {
        toast.error('Authentication failed. Please log in again.');
      }
    });

    // Task event handlers
    socket.on('task:created', (data) => {
      console.log('📝 Task created:', data);
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.stats());
      
      if (data.createdBy.id !== userId) {
        toast.success(`New task assigned: ${data.task.title}`);
      }
    });

    socket.on('task:updated', (data) => {
      console.log('📝 Task updated:', data);
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.detail(data.taskId));
      queryClient.invalidateQueries(taskKeys.stats());
      
      if (data.updatedBy.id !== userId) {
        toast(`Task updated: ${data.task.title}`, {
          icon: '✏️',
        });
      }
    });

    socket.on('task:status_changed', (data) => {
      console.log('📝 Task status changed:', data);
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.detail(data.taskId));
      queryClient.invalidateQueries(taskKeys.stats());
      
      if (data.changedBy.id !== userId) {
        const statusEmoji = {
          todo: '📋',
          in_progress: '🔄',
          completed: '✅',
          cancelled: '❌',
        };
        
        toast(`Task ${data.newStatus.replace('_', ' ')}: ${data.task.title}`, {
          icon: statusEmoji[data.newStatus as keyof typeof statusEmoji],
        });
      }
    });

    socket.on('task:assigned', (data) => {
      console.log('📝 Task assigned:', data);
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.detail(data.taskId));
      
      if (data.assignedTo.id === userId && data.assignedBy.id !== userId) {
        toast.success(`You've been assigned: ${data.task.title}`);
      }
    });

    socket.on('task:comment_added', (data) => {
      console.log('💬 Comment added:', data);
      queryClient.invalidateQueries(taskKeys.detail(data.taskId));
      
      if (data.author.id !== userId) {
        toast(`New comment from ${data.author.username}`, {
          icon: '💬',
        });
      }
    });

    socket.on('task:attachment_added', (data) => {
      console.log('📎 Attachment added:', data);
      queryClient.invalidateQueries(taskKeys.detail(data.taskId));
      
      if (data.uploadedBy.id !== userId) {
        toast(`New attachment: ${data.attachment.originalName}`, {
          icon: '📎',
        });
      }
    });

    socket.on('task:deleted', (data) => {
      console.log('🗑️ Task deleted:', data);
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.stats());
      
      if (data.deletedBy.id !== userId) {
        toast('A task has been deleted', {
          icon: '🗑️',
        });
      }
    });

    socket.on('task:subtask_updated', (data) => {
      console.log('✅ Subtask updated:', data);
      queryClient.invalidateQueries(taskKeys.detail(data.taskId));
      queryClient.invalidateQueries(taskKeys.lists());
      queryClient.invalidateQueries(taskKeys.stats());
    });

    // User presence handlers
    socket.on('user:status', (data) => {
      console.log('👤 User status:', data);
      // Could be used to show online/offline status in UI
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      console.log('⌨️ User typing:', data);
      // Show typing indicator in task comments
    });

    socket.on('typing:stop', (data) => {
      console.log('⌨️ User stopped typing:', data);
      // Hide typing indicator
    });

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket connection');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId, queryClient]);

  // Helper functions to emit events
  const joinTaskRoom = (taskId: string) => {
    socketRef.current?.emit('task:join', taskId);
  };

  const leaveTaskRoom = (taskId: string) => {
    socketRef.current?.emit('task:leave', taskId);
  };

  const startTyping = (taskId: string) => {
    socketRef.current?.emit('typing:start', { taskId });
  };

  const stopTyping = (taskId: string) => {
    socketRef.current?.emit('typing:stop', { taskId });
  };

  return {
    socket: socketRef.current,
    joinTaskRoom,
    leaveTaskRoom,
    startTyping,
    stopTyping,
    isConnected: socketRef.current?.connected ?? false,
  };
};