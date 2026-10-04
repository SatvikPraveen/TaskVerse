// apps/api/src/modules/activity/activity.routes.ts
import { Router } from 'express';

import { authenticateToken } from '@/middleware/auth';

import { ActivityController } from './activity.controller';

const router = Router();

router.use(authenticateToken);

router.get('/', ActivityController.feed);
router.get('/tasks/:taskId', ActivityController.forTask);

export default router;
