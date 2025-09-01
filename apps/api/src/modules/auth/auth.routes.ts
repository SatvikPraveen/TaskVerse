// apps/api/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticateToken } from '@/middleware/auth';
import { authRateLimitMiddleware } from '@/middleware/rateLimit';

const router = Router();

// Public routes with stricter rate limiting
router.post('/register', authRateLimitMiddleware, AuthController.register);
router.post('/login', authRateLimitMiddleware, AuthController.login);
router.post('/refresh', authRateLimitMiddleware, AuthController.refreshToken);
router.post('/logout', AuthController.logout);

// Protected routes
router.use(authenticateToken);
router.get('/profile', AuthController.getProfile);
router.post('/logout-all', AuthController.logoutAll);
router.post('/change-password', AuthController.changePassword);
router.get('/sessions', AuthController.getSessions);
router.delete('/sessions/:sessionId', AuthController.revokeSession);

export default router;