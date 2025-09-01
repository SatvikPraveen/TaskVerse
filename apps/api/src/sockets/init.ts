// apps/api/src/sockets/init.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '@/modules/users/user.model';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { initTaskNamespace } from './tasks.nsp';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    username: string;
    email: string;
  };
}

export function initSocketIO(io: SocketIOServer) {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
      
      // Verify user exists
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user info to socket
      socket.userId = user._id.toString();
      socket.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      };

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`User ${socket.user?.username} connected`, {
      userId: socket.userId,
      socketId: socket.id,
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Handle user presence
    socket.on('user:online', () => {
      socket.broadcast.emit('user:status', {
        userId: socket.userId,
        status: 'online',
        timestamp: new Date(),
      });
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      socket.to(`task:${data.taskId}`).emit('typing:start', {
        userId: socket.userId,
        username: socket.user?.username,
        taskId: data.taskId,
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`task:${data.taskId}`).emit('typing:stop', {
        userId: socket.userId,
        taskId: data.taskId,
      });
    });

    // Handle task room management
    socket.on('task:join', (taskId: string) => {
      socket.join(`task:${taskId}`);
      logger.debug(`User ${socket.userId} joined task room: ${taskId}`);
    });

    socket.on('task:leave', (taskId: string) => {
      socket.leave(`task:${taskId}`);
      logger.debug(`User ${socket.userId} left task room: ${taskId}`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`User ${socket.user?.username} disconnected`, {
        userId: socket.userId,
        socketId: socket.id,
        reason,
      });

      // Broadcast user offline status
      socket.broadcast.emit('user:status', {
        userId: socket.userId,
        status: 'offline',
        timestamp: new Date(),
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', {
        userId: socket.userId,
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  // Initialize namespaces
  initTaskNamespace(io);

  logger.info('🔌 Socket.IO initialized successfully');
}