// apps/api/src/modules/users/user.routes.ts
import { Router } from 'express';

import { authenticateToken } from '@/middleware/auth';

import { UserController } from './user.controller';

const router = Router();

router.use(authenticateToken);

router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/preferences', UserController.updatePreferences);
router.get('/search', UserController.searchUsers);
router.get('/stats', UserController.getUserStats);
// Static routes must precede the parameterised one.
router.delete('/account', UserController.deleteAccount);
router.get('/:userId', UserController.getUserById);

export default router;
