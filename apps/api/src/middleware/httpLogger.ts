// apps/api/src/middleware/httpLogger.ts
import type { IncomingMessage, ServerResponse } from 'http';

import pinoHttp from 'pino-http';

import { logger } from '@/config/logger';

const QUIET_PATHS = new Set(['/health', '/health/ready', '/metrics']);

/** Structured access log; one line per request with latency and correlation id. */
export const httpLogger = pinoHttp({
  logger,
  genReqId: req => (req as IncomingMessage & { id?: string }).id ?? 'unknown',
  autoLogging: {
    ignore: req => QUIET_PATHS.has(req.url?.split('?')[0] ?? ''),
  },
  customLogLevel: (_req, res: ServerResponse, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.url} ${res.statusCode}`,
  serializers: {
    req: req => ({ method: req.method, url: req.url, remoteAddress: req.remoteAddress }),
    res: res => ({ statusCode: res.statusCode }),
  },
});
