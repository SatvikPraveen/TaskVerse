// apps/api/src/modules/planning/planning.routes.ts
import { Router } from 'express';

import { authenticateToken } from '@/middleware/auth';

import { PlanningController } from './planning.controller';

const router = Router();

router.use(authenticateToken);

router.get('/policies', PlanningController.listPolicies);
router.get('/recommendations', PlanningController.recommendations);
router.get('/critical-path', PlanningController.criticalPath);
router.get('/eisenhower', PlanningController.eisenhower);
router.get('/forecast', PlanningController.forecast);
router.get('/simulate', PlanningController.simulate);

export default router;
