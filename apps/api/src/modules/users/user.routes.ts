// apps/api/src/modules/users/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller';
import { authenticateToken } from '@/middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticateToken);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/preferences', UserController.updatePreferences);
router.get('/search', UserController.searchUsers);
router.get('/stats', UserController.getUserStats);
router.get('/:userId', UserController.getUserById);
router.delete('/account', UserController.deleteAccount);

export default router;