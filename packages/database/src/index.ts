import mongoose from 'mongoose';
import { createLogger } from '@careeros/logger';

const logger = createLogger('database-client');

export interface DatabaseConnection {
  connection: mongoose.Connection;
  mongoose: typeof mongoose;
}

export async function createDatabaseConnection(
  connectionString: string,
  options: mongoose.ConnectOptions = {},
): Promise<DatabaseConnection> {
  logger.info('Initializing MongoDB connection via Mongoose...');

  try {
    const conn = await mongoose.connect(connectionString, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
      ...options,
    });

    logger.info('Successfully connected to MongoDB');

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'Unexpected error on MongoDB connection');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB connection disconnected');
    });

    return {
      connection: conn.connection,
      mongoose: conn,
    };
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect to MongoDB');
    throw error;
  }
}

export async function testConnection(conn?: mongoose.Connection): Promise<boolean> {
  try {
    const targetConnection = conn || mongoose.connection;
    if (targetConnection.readyState === 1) {
      logger.info('Database connectivity test succeeded (readyState: 1)');
      return true;
    }
    logger.warn(`Database connectivity test returned readyState ${targetConnection.readyState}`);
    return false;
  } catch (error) {
    logger.error({ err: error }, 'Database connectivity test failed');
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting from MongoDB');
  }
}

export { mongoose };
