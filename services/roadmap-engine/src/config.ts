import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3006,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret-do-not-use-in-prod',
  TWIN_SERVICE_URL: process.env.TWIN_SERVICE_URL || 'http://localhost:3005',
  GOALS_SERVICE_URL: process.env.GOALS_SERVICE_URL || 'http://localhost:3003',
  PROFILE_SERVICE_URL: process.env.PROFILE_SERVICE_URL || 'http://localhost:3002',
};
