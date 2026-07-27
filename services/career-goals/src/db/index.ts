import { createDatabaseConnection, DatabaseConnection } from '@careeros/database';
import { config } from '../config.js';
import * as schema from './schema.js';

let dbInstance: DatabaseConnection<typeof schema> | null = null;

export function getDb(): DatabaseConnection<typeof schema> {
  if (!dbInstance) {
    dbInstance = createDatabaseConnection(config.DATABASE_URL, {}, schema);
  }
  return dbInstance;
}
