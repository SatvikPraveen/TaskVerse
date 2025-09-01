// apps/api/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { User } from '@/modules/users/user.model';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    username: string;
  };
}

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        error: 'Access Denied',
        message: 'No token provided',
      });
      return;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    // Verify user still exists
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      res.status(401).json({
        error: 'Access Denied',
        message: 'Invalid token - user not found',
      });
      return;
    }

    // Add user info to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      username: user.username,
    };

    next();
  } catch (error) {
    logger.error('Authentication error:', error);

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({
        error: 'Access Denied',
        message: 'Invalid token',
      });
      return;
    }

    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({
        error: 'Access Denied',
        message: 'Token expired',
      });
      return;
    }

    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;
    const user = await User.findById(decoded.userId).select('-password');

    if (user) {
      req.user = {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
      };
    }

    next();
  } catch (error) {
    // For optional auth, we just continue without user info
    next();
  }
};