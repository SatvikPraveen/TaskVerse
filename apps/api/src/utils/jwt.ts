// apps/api/src/utils/jwt.ts
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

export interface JwtPayload {
  userId: string;
  type: 'access' | 'refresh';
  tokenId?: string;
  iat?: number;
  exp?: number;
}

export const generateAccessToken = (userId: string): string => {
  return jwt.sign(
    {
      userId,
      type: 'access',
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
      issuer: 'taskverse-api',
      audience: 'taskverse-client',
    }
  );
};

export const generateRefreshToken = (userId: string, tokenId: string): string => {
  return jwt.sign(
    {
      userId,
      type: 'refresh',
      tokenId,
    },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
      issuer: 'taskverse-api',
      audience: 'taskverse-client',
    }
  );
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_SECRET, {
    issuer: 'taskverse-api',
    audience: 'taskverse-client',
  }) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET, {
    issuer: 'taskverse-api',
    audience: 'taskverse-client',
  }) as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
};

export const getTokenExpiration = (token: string): Date | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded?.exp ? new Date(decoded.exp * 1000) : null;
  } catch {
    return null;
  }
};

export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  return expiration ? expiration < new Date() : true;
};