// apps/api/src/modules/analytics/analytics.routes.ts
import { Router } from 'express';

import { authenticateToken } from '@/middleware/auth';

import { AnalyticsController } from './analytics.controller';

const router = Router();

router.use(authenticateToken);

router.get('/flow', AnalyticsController.flow);
router.get('/throughput', AnalyticsController.throughput);
router.get('/cfd', AnalyticsController.cumulativeFlow);
router.get('/aging', AnalyticsController.aging);

export default router;
