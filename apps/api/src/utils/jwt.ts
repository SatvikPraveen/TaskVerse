// apps/api/src/utils/jwt.ts
import jwt, { type SignOptions } from 'jsonwebtoken';

import { env } from '@/config/env';

export interface JwtPayload {
  userId: string;
  type: 'access' | 'refresh';
  tokenId?: string;
  iat?: number;
  exp?: number;
}

const ISSUER = 'taskverse-api';
const AUDIENCE = 'taskverse-client';

/** jsonwebtoken types `expiresIn` as a template literal union; env strings need a cast. */
const expiresIn = (value: string): SignOptions['expiresIn'] =>
  value as unknown as SignOptions['expiresIn'];

export const generateAccessToken = (userId: string): string =>
  jwt.sign({ userId, type: 'access' } satisfies JwtPayload, env.JWT_SECRET, {
    expiresIn: expiresIn(env.JWT_ACCESS_EXPIRES_IN),
    issuer: ISSUER,
    audience: AUDIENCE,
  });

export const generateRefreshToken = (userId: string, tokenId: string): string =>
  jwt.sign({ userId, type: 'refresh', tokenId } satisfies JwtPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: expiresIn(env.JWT_REFRESH_EXPIRES_IN),
    issuer: ISSUER,
    audience: AUDIENCE,
  });

export const verifyAccessToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_SECRET, { issuer: ISSUER, audience: AUDIENCE }) as JwtPayload;

export const verifyRefreshToken = (token: string): JwtPayload =>
  jwt.verify(token, env.JWT_REFRESH_SECRET, { issuer: ISSUER, audience: AUDIENCE }) as JwtPayload;

export const decodeToken = (token: string): JwtPayload | null => {
  try {
    return jwt.decode(token) as JwtPayload | null;
  } catch {
    return null;
  }
};

export const getTokenExpiration = (token: string): Date | null => {
  const decoded = decodeToken(token);
  return decoded?.exp ? new Date(decoded.exp * 1000) : null;
};

export const isTokenExpired = (token: string): boolean => {
  const expiration = getTokenExpiration(token);
  return expiration ? expiration < new Date() : true;
};
