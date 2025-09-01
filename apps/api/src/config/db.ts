// apps/api/src/config/db.ts
import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = env.NODE_ENV === 'test' 
      ? (env.MONGODB_TEST_URI || env.MONGODB_URI)
      : env.MONGODB_URI;

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      bufferCommands: false,
      bufferMaxEntries: 0,
    };

    await mongoose.connect(mongoURI, options);

    mongoose.connection.on('connected', () => {
      logger.info('📦 MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      logger.error('🔥 MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('📦 MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('📦 MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('🔥 MongoDB connection failed:', error);
    throw error;
  }
};

const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.connection.close();
    logger.info('📦 MongoDB disconnected');
  } catch (error) {
    logger.error('🔥 Error disconnecting from MongoDB:', error);
    throw error;
  }
};

export { connectDB, disconnectDB };