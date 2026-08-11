import mongoose from 'mongoose';
import dns from 'dns';
import { createLogger } from '@careeros/logger';

const logger = createLogger('database-client');

function configureDns(connectionString: string) {
  // Check if explicit DNS servers are configured via env
  if (process.env.DNS_SERVERS) {
    try {
      const servers = process.env.DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean);
      if (servers.length > 0) {
        logger.info(`Setting custom DNS servers from environment: ${servers.join(', ')}`);
        dns.setServers(servers);
        return;
      }
    } catch (err) {
      logger.error({ err }, 'Failed to set custom DNS servers from DNS_SERVERS env variable');
    }
  }

  // Fallback for mongodb+srv connections when Node's DNS resolver gets stuck with only loopback
  if (connectionString.startsWith('mongodb+srv://')) {
    try {
      const servers = dns.getServers();
      const isLoopbackOnly = servers.every(ip => ip === '127.0.0.1' || ip === '::1' || ip === 'localhost');
      if (isLoopbackOnly) {
        logger.warn('Detected local loopback only (127.0.0.1) in Node DNS servers, which often causes ECONNREFUSED for mongodb+srv connections. Falling back to public DNS resolvers (1.1.1.1, 8.8.8.8)...');
        dns.setServers(['1.1.1.1', '8.8.8.8']);
      }
    } catch (err) {
      logger.error({ err }, 'Failed to check or set fallback DNS servers');
    }
  }
}

export interface DatabaseConnection {
  connection: mongoose.Connection;
  mongoose: typeof mongoose;
}

export async function createDatabaseConnection(
  connectionString: string,
  options: mongoose.ConnectOptions = {},
): Promise<DatabaseConnection> {
  configureDns(connectionString);
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
