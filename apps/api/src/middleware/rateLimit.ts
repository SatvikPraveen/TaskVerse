// apps/api/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

import { env } from '@/config/env';

const tooMany = (message: string, retryAfterSeconds: number) => ({
  error: 'Too Many Requests',
  message,
  retryAfter: retryAfterSeconds,
});

export const rateLimitMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany(
    'Too many requests from this IP, please try again later.',
    Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000)
  ),
});

export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: tooMany('Too many authentication attempts, please try again later.', 900),
});

export const uploadRateLimitMiddleware = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: env.UPLOAD_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: tooMany('Too many uploads from this IP, please try again later.', 3600),
});
