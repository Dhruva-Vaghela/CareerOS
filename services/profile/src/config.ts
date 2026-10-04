import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { createLogger } from '@careeros/logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logger = createLogger('profile-config');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3002'),
  DATABASE_URL: z.string().default('mongodb://localhost:27017/careeros'),
  JWT_SECRET: z.string().default('local-dev-secret-do-not-use-in-prod'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  logger.error({ err: parsed.error.format() }, 'Invalid environment variables');
  process.exit(1);
}

export const config = parsed.data;
