import express from 'express';
import cors from 'cors';
import { createLogger } from '@careeros/logger';
import { globalErrorHandler } from '@careeros/errors';
import { parseAuth } from './middleware/auth.js';
import { config } from './config.js';
import { initDb } from './db/index.js';
import { testConnection, disconnectDatabase } from '@careeros/database';
import { companyInterviewRouter } from './routes/companyInterview.routes.js';
import { voiceRouter } from './routes/voice.routes.js';
import { interviewHistoryRouter } from './routes/interviewHistory.routes.js';
import { CompanyInterviewService } from './services/companyInterview.service.js';

const logger = createLogger('interview-service');

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(parseAuth());

  // Mount routes
  app.use('/api/v1/interviews/company', companyInterviewRouter);
  app.use('/api/v1/interviews/voice', voiceRouter);
  app.use('/api/v1/interviews', interviewHistoryRouter);

  // Health check endpoint
  app.get('/api/v1/interviews/health', (_req, res) => {
    res.json({ status: 'ok', service: 'interview-service', timestamp: new Date() });
  });

  app.use(globalErrorHandler);

  return app;
}

async function bootstrap() {
  logger.info({ env: config.NODE_ENV }, 'Starting CareerOS Interview service...');

  try {
    const { connection } = await initDb();
    const isConnected = await testConnection(connection);
    if (!isConnected) {
      logger.error('Failed to establish database connection during bootstrap');
    } else {
      // Seed default profiles
      const service = new CompanyInterviewService();
      await service.listProfiles();
    }
  } catch (err) {
    logger.error({ err }, 'Error connecting to database during bootstrap');
  }

  const app = createApp();

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, 'Interview Service Server listening');
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
    logger.fatal({ err }, 'Interview service failed to bootstrap');
    process.exit(1);
  });
}

export { bootstrap };
