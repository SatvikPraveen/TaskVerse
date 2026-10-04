// apps/api/src/middleware/requestId.ts
import { randomUUID } from 'crypto';

import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

const SAFE_ID = /^[A-Za-z0-9._-]{1,128}$/;

export interface RequestWithId extends Request {
  id: string;
}

/**
 * Attaches a correlation id to every request. An inbound X-Request-Id from a
 * trusted proxy is honoured when it is well-formed; otherwise a UUID is minted.
 * The id is echoed in the response and included in every log line and error body.
 */
export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const inbound = req.header(REQUEST_ID_HEADER);
  const id = inbound && SAFE_ID.test(inbound) ? inbound : randomUUID();
  (req as RequestWithId).id = id;
  res.setHeader(REQUEST_ID_HEADER, id);
  next();
};
