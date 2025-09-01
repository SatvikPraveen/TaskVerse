// apps/api/src/modules/tasks/task.routes.ts
import { Router } from 'express';
import { TaskController } from './task.controller';
import { authenticateToken } from '@/middleware/auth';

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