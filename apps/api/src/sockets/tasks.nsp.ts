// apps/api/src/sockets/tasks.nsp.ts
import { Server as SocketIOServer } from 'socket.io';
import { Task } from '@/modules/tasks/task.model';
import { logger } from '@/config/logger';

export function initTaskNamespace(io: SocketIOServer) {
  // Helper function to emit task events
  const emitTaskEvent = async (eventType: string, taskId: string, data: any) => {
    try {
      // Get task to determine who should receive the event
      const task = await Task.findById(taskId)
        .populate('createdBy', 'username')
        .populate('assignedTo', 'username')
        .select('createdBy assignedTo title');

      if (!task) {
        logger.warn(`Task not found for event: ${taskId}`);
        return;
      }

      const recipients = [];
      
      // Add task creator
      if (task.createdBy) {
        recipients.push(`user:${task.createdBy._id}`);
      }
      
      // Add assigned user if different from creator
      if (task.assignedTo && task.assignedTo._id.toString() !== task.createdBy._id.toString()) {
        recipients.push(`user:${task.assignedTo._id}`);
      }

      // Emit to task room and individual users
      io.to(`task:${taskId}`).emit(eventType, {
        taskId,
        ...data,
        timestamp: new Date(),
      });

      // Also emit to user rooms
      recipients.forEach(recipient => {
        io.to(recipient).emit(eventType, {
          taskId,
          ...data,
          timestamp: new Date(),
        });
      });

      logger.debug(`Task event emitted: ${eventType}`, {
        taskId,
        recipients: recipients.length,
      });
    } catch (error) {
      logger.error(`Error emitting task event: ${eventType}`, {
        taskId,
        error: error.message,
      });
    }
  };

  // Task creation event
  io.on('task:created', async (data) => {
    await emitTaskEvent('task:created', data.taskId, {
      task: data.task,
      createdBy: data.createdBy,
    });
  });

  // Task update event
  io.on('task:updated', async (data) => {
    await emitTaskEvent('task:updated', data.taskId, {
      task: data.task,
      changes: data.changes,
      updatedBy: data.updatedBy,
    });
  });

  // Task status change event
  io.on('task:status_changed', async (data) => {
    await emitTaskEvent('task:status_changed', data.taskId, {
      task: data.task,
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
      changedBy: data.changedBy,
    });
  });

  // Task assignment event
  io.on('task:assigned', async (data) => {
    await emitTaskEvent('task:assigned', data.taskId, {
      task: data.task,
      assignedTo: data.assignedTo,
      assignedBy: data.assignedBy,
    });
  });

  // Task comment added event
  io.on('task:comment_added', async (data) => {
    await emitTaskEvent('task:comment_added', data.taskId, {
      comment: data.comment,
      author: data.author,
    });
  });

  // Task attachment added event
  io.on('task:attachment_added', async (data) => {
    await emitTaskEvent('task:attachment_added', data.taskId, {
      attachment: data.attachment,
      uploadedBy: data.uploadedBy,
    });
  });

  // Task deleted event
  io.on('task:deleted', async (data) => {
    await emitTaskEvent('task:deleted', data.taskId, {
      deletedBy: data.deletedBy,
    });
  });

  // Subtask updated event
  io.on('task:subtask_updated', async (data) => {
    await emitTaskEvent('task:subtask_updated', data.taskId, {
      subtask: data.subtask,
      updatedBy: data.updatedBy,
    });
  });

  logger.info('📝 Task namespace events initialized');
}

// Helper function to emit task events from controllers
export const emitTaskEvent = (eventType: string, taskId: string, data: any) => {
  // This will be called from task controllers
  process.nextTick(() => {
    // Use process.nextTick to ensure the event is emitted after the response
    const io = require('@/server').io; // This would need to be properly exported
    if (io) {
      io.emit(eventType, { taskId, ...data });
    }
  });
};