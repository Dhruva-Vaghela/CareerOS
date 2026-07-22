import express from 'express';
import cors from 'cors';
import { createLogger } from '@careeros/logger';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { testConnection } from '@careeros/database';
import { authRouter } from './routes/auth.js';

const logger = createLogger('auth-service');

async function bootstrap() {
  logger.info({ env: config.NODE_ENV }, 'Starting CareerOS Auth service...');

  try {
    const { pool } = getDb();
    const isConnected = await testConnection(pool);
    if (!isConnected) {
      logger.error('Failed to establish database connection during bootstrap');
    }
  } catch (err) {
    logger.error({ err }, 'Error connecting to database during bootstrap');
  }

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(parseAuth());

  app.use('/api/v1/auth', authRouter);

  app.use(globalErrorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Auth Server successfully started and listening');
  });

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close(async () => {
      logger.info('HTTP server closed');
      const { pool } = getDb();
      await pool.end();
      logger.info('Database pool closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// In test environment, don't start the server immediately to allow vitest to run
if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.fatal({ err }, 'Service failed to bootstrap');
    process.exit(1);
  });
}

// Export app/bootstrap for testing if needed
export { bootstrap };
