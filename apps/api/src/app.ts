// apps/api/src/app.ts
import express from 'express';
import helmet from 'helmet';
import { corsMiddleware } from '@/middleware/cors';
import { rateLimitMiddleware } from '@/middleware/rateLimit';
import { errorHandler } from '@/middleware/error';
import { logger } from '@/config/logger';

// Route imports
import authRoutes from '@/modules/auth/auth.routes';
import userRoutes from '@/modules/users/user.routes';
import categoryRoutes from '@/modules/categories/category.routes';
import taskRoutes from '@/modules/tasks/task.routes';
import uploadRoutes from '@/modules/uploads/upload.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(corsMiddleware);
app.use(rateLimitMiddleware);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/uploads', uploadRoutes);

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'TaskVerse API',
    version: '1.0.0',
    description: 'Task management API with real-time updates',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      categories: '/api/categories',
      tasks: '/api/tasks',
      uploads: '/api/uploads',
    },
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;