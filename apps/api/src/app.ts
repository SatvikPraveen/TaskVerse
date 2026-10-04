// apps/api/src/app.ts
import express from 'express';
import helmet from 'helmet';

import { isDatabaseReady } from '@/config/db';
import { env } from '@/config/env';
import { registerEventSubscribers } from '@/events/bootstrap';
import { corsMiddleware } from '@/middleware/cors';
import { errorHandler } from '@/middleware/error';
import { httpLogger } from '@/middleware/httpLogger';
import { rateLimitMiddleware } from '@/middleware/rateLimit';
import { requestId } from '@/middleware/requestId';
import activityRoutes from '@/modules/activity/activity.routes';
import analyticsRoutes from '@/modules/analytics/analytics.routes';
import authRoutes from '@/modules/auth/auth.routes';
import categoryRoutes from '@/modules/categories/category.routes';
import planningRoutes from '@/modules/planning/planning.routes';
import taskRoutes from '@/modules/tasks/task.routes';
import uploadRoutes from '@/modules/uploads/upload.routes';
import userRoutes from '@/modules/users/user.routes';
import { metricsHandler, metricsMiddleware, registerMetricsSubscribers } from '@/observability/metrics';

registerEventSubscribers();
if (env.METRICS_ENABLED) registerMetricsSubscribers();

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(requestId);
app.use(httpLogger);
if (env.METRICS_ENABLED) app.use(metricsMiddleware);

app.use(helmet());
app.use(corsMiddleware);
app.use(rateLimitMiddleware);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

if (env.METRICS_ENABLED) app.get('/metrics', metricsHandler);

app.get('/health/ready', (_req, res) => {
  const ready = isDatabaseReady();
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database: ready });
});

app.get('/api', (_req, res) => {
  res.json({
    name: 'TaskVerse API',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      categories: '/api/categories',
      tasks: '/api/tasks',
      uploads: '/api/uploads',
      planning: '/api/planning',
      analytics: '/api/analytics',
      activity: '/api/activity',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/planning', planningRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

export default app;
