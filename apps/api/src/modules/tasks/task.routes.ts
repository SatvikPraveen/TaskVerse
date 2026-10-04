// apps/api/src/modules/tasks/task.routes.ts
import { Router } from 'express';

import { authenticateToken } from '@/middleware/auth';

import { TaskController } from './task.controller';

const router = Router();

// All task routes require authentication
router.use(authenticateToken);

router.get('/', TaskController.getTasks);
router.get('/stats', TaskController.getTaskStats);
router.post('/', TaskController.createTask);
router.get('/:taskId', TaskController.getTaskById);
router.put('/:taskId', TaskController.updateTask);
router.delete('/:taskId', TaskController.deleteTask);
router.post('/:taskId/comments', TaskController.addComment);
router.put('/:taskId/subtasks/:subtaskId', TaskController.updateSubtask);

export default router;
