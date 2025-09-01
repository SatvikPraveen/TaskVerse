// apps/api/src/server.ts
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app';
import { connectDB } from '@/config/db';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { initSocketIO } from '@/sockets/init';

const server = http.createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: env.ALLOWED_ORIGINS,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Initialize socket connections and namespaces
initSocketIO(io);

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('✅ Connected to MongoDB');

    // Start HTTP server
    server.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 API URL: ${env.API_BASE_URL}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

function gracefulShutdown(signal: string) {
  logger.info(`📴 ${signal} received, shutting down gracefully`);
  
  server.close(() => {
    logger.info('🔒 HTTP server closed');
    process.exit(0);
  });

  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('⚡ Force closing server');
    process.exit(1);
  }, 30000);
}

startServer();