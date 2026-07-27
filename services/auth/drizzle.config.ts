import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  schemaFilter: ['auth'],
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || '',
  },
} satisfies Config;

