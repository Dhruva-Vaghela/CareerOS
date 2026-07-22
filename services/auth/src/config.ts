import * as dotenv from 'dotenv';
import { z } from 'zod';
import { createLogger } from '@careeros/logger';

const logger = createLogger('auth-config');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/careeros'),
  JWT_SECRET: z.string().default('local-dev-secret-do-not-use-in-prod'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error({ err: parsed.error.format() }, 'Invalid environment variables');
  process.exit(1);
}

export const config = parsed.data;
