import express from 'express';
import cors from 'cors';
import { createLogger } from '@careeros/logger';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { requestLogger } from './middleware/requestLogger.js';
import { config } from './config.js';
import { getDb } from './db/index.js';
import { testConnection } from '@careeros/database';
import { eventBus } from './bus.js';
import { healthRouter } from './routes/health.js';

const logger = createLogger('health-check-service');

async function bootstrap() {
  logger.info({ env: config.NODE_ENV }, 'Starting CareerOS Health-Check service...');

  // Initialize DB and test connection
  try {
    const { pool } = getDb();
    const isConnected = await testConnection(pool);
    if (!isConnected) {
      logger.error('Failed to establish database connection during bootstrap');
    }
  } catch (err) {
    logger.error({ err }, 'Error connecting to database during bootstrap');
  }

  // Subscribe to 'system.healthy' to verify Event Bus subscriptions are working
  await eventBus.subscribe('system.healthy', (event) => {
    logger.info(
      { eventName: event.name, payload: event.payload, traceId: event.metadata.traceId },
      'Event Bus Verification: Subscriber successfully caught system.healthy event!',
    );
  });

  const app = express();

  // Middleware pipeline
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger());
  app.use(parseAuth());

  // Mount routes
  app.use('/api/v1', healthRouter);

  // Global Error Handler
  app.use(globalErrorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Server successfully started and listening');
  });

  // Handle graceful shutdown
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

// Execute bootstrap and handle failures
bootstrap().catch((err) => {
  logger.fatal({ err }, 'Service failed to bootstrap');
  process.exit(1);
});
