import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

export const config = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3004,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  JWT_SECRET: process.env.JWT_SECRET || 'local-dev-secret-do-not-use-in-prod',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || 'careeros',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '132916365915536',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || 'E_Sqbyh5p3jDBVhoYN1CbP-yRZw',
};
