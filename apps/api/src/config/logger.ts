// apps/api/src/config/logger.ts
import pino from 'pino';

import { env } from './env';

export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
  transport:
    env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true, ignore: 'pid,hostname', translateTime: 'HH:MM:ss' },
        }
      : undefined,
  formatters: {
    level: label => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: { service: 'taskverse-api', env: env.NODE_ENV },
  redact: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.refreshToken'],
});
