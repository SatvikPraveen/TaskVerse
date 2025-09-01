// apps/api/src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service';
import { asyncHandler } from '@/middleware/error';
import { AuthRequest } from '@/middleware/auth';

// Validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/),
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

export class AuthController {
  static register = asyncHandler(async (req: Request, res: Response) => {
    const validatedData = registerSchema.parse(req.body);
    
    const result = await AuthService.register(validatedData);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: result,
    });
  });

  static login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = loginSchema.parse(req.body);
    
    const deviceInfo = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await AuthService.login(email, password, deviceInfo, ipAddress);

    res.json({
      success: true,
      message: 'Login successful',
      data: result,
    });
  });

  static refreshToken = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    const tokens = await AuthService.refreshTokens(refreshToken);

    res.json({
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    });
  });

  static logout = asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = refreshTokenSchema.parse(req.body);

    await AuthService.logout(refreshToken);

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });

  static logoutAll = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;

    await AuthService.logoutAllDevices(userId);

    res.json({
      success: true,
      message: 'Logged out from all devices successfully',
    });
  });

  static changePassword = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    await AuthService.changePassword(userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  });

  static getProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.json({
      success: true,
      data: { user: req.user },
    });
  });

  static getSessions = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const sessions = await AuthService.getUserSessions(userId);

    res.json({
      success: true,
      data: { sessions },
    });
  });

  static revokeSession = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id;
    const { sessionId } = z.object({ sessionId: z.string() }).parse(req.params);

    await AuthService.revokeSession(userId, sessionId);

    res.json({
      success: true,
      message: 'Session revoked successfully',
    });
  });
}