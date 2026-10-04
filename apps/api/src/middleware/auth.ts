// apps/api/src/middleware/auth.ts
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { User } from '@/modules/users/user.model';
import { verifyAccessToken } from '@/utils/jwt';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

const extractBearer = (req: Request): string | undefined => {
  const header = req.headers.authorization;
  if (!header) return undefined;
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : undefined;
};

/** Resolves a bearer token to an active user, or returns null when it cannot. */
export const resolveUserFromToken = async (token: string): Promise<AuthUser | null> => {
  const decoded = verifyAccessToken(token);
  if (decoded.type !== 'access') return null;
  const user = await User.findOne({ _id: decoded.userId, isActive: true }).select(
    'email username'
  );
  if (!user) return null;
  return { id: user._id.toString(), email: user.email, username: user.username };
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearer(req);
  if (!token) {
    res.status(401).json({ error: 'Access Denied', message: 'No token provided' });
    return;
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      res.status(401).json({ error: 'Access Denied', message: 'Invalid token - user not found' });
      return;
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(403).json({ error: 'Access Denied', message: 'Token expired' });
      return;
    }
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(403).json({ error: 'Access Denied', message: 'Invalid token' });
      return;
    }
    next(error);
  }
};

export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const token = extractBearer(req);
  if (!token) return next();
  try {
    const user = await resolveUserFromToken(token);
    if (user) req.user = user;
  } catch {
    // Optional auth never fails the request.
  }
  next();
};
