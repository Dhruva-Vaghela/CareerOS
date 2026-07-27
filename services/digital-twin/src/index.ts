import express from 'express';
import cors from 'cors';
import { createLogger } from '@careeros/logger';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { testConnection } from '@careeros/database';
import { digitalTwinRouter } from './routes/digitalTwin.routes.js';
import { setupEventSubscriptions } from './bus.js';

const logger = createLogger('digital-twin-service');

async function bootstrap() {
  logger.info({ env: config.NODE_ENV }, 'Starting CareerOS Digital Twin service...');

  try {
    const { pool } = getDb();
    const isConnected = await testConnection(pool);
    if (!isConnected) {
      logger.error('Failed to establish database connection during bootstrap');
    }
  } catch (err) {
    logger.error({ err }, 'Error connecting to database during bootstrap');
  }

  // Initialize event subscriptions
  setupEventSubscriptions();

  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(parseAuth());

  app.use('/api/v1/digital-twin', digitalTwinRouter);

  app.use(globalErrorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Digital Twin Server listening');
  });

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close(async () => {
      logger.info('HTTP server closed');
      const { pool } = getDb();
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.fatal({ err }, 'Digital Twin service failed to bootstrap');
    process.exit(1);
  });
}

export { bootstrap };
