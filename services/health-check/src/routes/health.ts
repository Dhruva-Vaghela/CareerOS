import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { formatSuccess, ConflictError } from '@careeros/errors';
import { validateRequest } from '@careeros/validation';
import { testConnection } from '@careeros/database';
import { getDb } from '../db/index.js';
import { systemChecks } from '../db/schema.js';
import { eventBus } from '../bus.js';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// 1. GET /health
router.get('/health', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { db, pool } = getDb();
    const isDbConnected = await testConnection(pool);

    if (!isDbConnected) {
      throw new Error('Database connection failed');
    }

    // Insert record into system Checks table to verify Drizzle schema & write capabilities
    const [inserted] = await db.insert(systemChecks).values({
      status: 'OK',
    }).returning();

    res.json(
      formatSuccess({
        status: 'UP',
        database: 'CONNECTED',
        healthCheckRecord: inserted,
      }),
    );
  } catch (err) {
    next(err);
  }
});

// 2. POST /test-validation
const testValidationSchema = z.object({
  message: z.string().min(5, 'Message must be at least 5 characters long'),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

router.post(
  '/test-validation',
  validateRequest({ body: testValidationSchema }),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const { message, priority } = req.body;
      const traceId = (req.headers['x-trace-id'] as string) || crypto.randomUUID();

      // Publish event to Event Bus to test publisher
      await eventBus.publish({
        name: 'system.healthy',
        metadata: {
          eventId: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          traceId,
          userId: req.user?.id,
        },
        payload: {
          message,
          priority,
        },
      });

      res.json(
        formatSuccess({
          message: 'Validation passed, event published to bus',
          data: { message, priority },
        }),
      );
    } catch (err) {
      next(err);
    }
  },
);

// 3. GET /test-error
router.get('/test-error', (req, res, next) => {
  // Test error mapping to global error handler
  next(
    new ConflictError(
      'Cannot modify this roadmap module because it contains mandatory dependencies',
      'MANDATORY_NODE_PROTECTED',
    ),
  );
});

// 4. GET /test-auth
router.get('/test-auth', requireAuth(), (req: AuthenticatedRequest, res: Response) => {
  res.json(
    formatSuccess({
      message: 'Access granted to secure route',
      userId: req.user!.id,
    }),
  );
});

export const healthRouter = router;
export default healthRouter;
