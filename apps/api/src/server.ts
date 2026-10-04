// apps/api/src/server.ts
import http from 'http';

import { Server as SocketIOServer } from 'socket.io';

import { connectDB, disconnectDB } from '@/config/db';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { initSocketIO } from '@/sockets/init';

import app from './app';

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: { origin: env.ALLOWED_ORIGINS, methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
});
initSocketIO(io);

async function start(): Promise<void> {
  await connectDB();
  server.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV, url: env.API_BASE_URL }, 'API listening');
  });
}

let shuttingDown = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, 'shutting down');

  const forceExit = setTimeout(() => {
    logger.error('forced shutdown after timeout');
    process.exit(1);
  }, 30_000);
  forceExit.unref();

  io.close();
  await new Promise<void>(resolve => server.close(() => resolve()));
  await disconnectDB();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('unhandledRejection', reason => {
  logger.error({ err: reason }, 'unhandled rejection');
});

start().catch(error => {
  logger.error({ err: error }, 'failed to start server');
  process.exit(1);
});
