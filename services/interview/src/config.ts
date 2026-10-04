import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export const config = {
  PORT: parseInt(process.env.PORT || '3009', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'mongodb://localhost:27017/careeros_interview',
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret-do-not-use-in-prod',
  SARVAM_API_KEY: (process.env.SARVAM_API_KEY || '').trim(),
};
