import express from 'express';
import cors from 'cors';
import { createLogger } from '@careeros/logger';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { testConnection, disconnectDatabase } from '@careeros/database';
import { assessmentRouter } from './routes/assessment.routes.js';

const logger = createLogger('assessment-service');

async function bootstrap() {
  logger.info({ env: config.NODE_ENV }, 'Starting CareerOS Assessment service...');

  try {
    const { connection } = await initDb();
    const isConnected = await testConnection(connection);
    if (!isConnected) {
      logger.error('Failed to establish database connection during bootstrap');
    }
  } catch (err) {
    logger.error({ err }, 'Error connecting to database during bootstrap');
  }

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));
  app.use(parseAuth());
  app.use('/api/v1/assessments', assessmentRouter);
  app.use(globalErrorHandler);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Assessment Server listening');
  });

  const shutdown = async () => {
    logger.info('Shutting down gracefully...');
    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    logger.fatal({ err }, 'Assessment service failed to bootstrap');
    process.exit(1);
  });
}

export { bootstrap };
