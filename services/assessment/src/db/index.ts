import { createDatabaseConnection, type DatabaseConnection } from '@careeros/database';
import { config } from '../config.js';

let connectionPromise: Promise<DatabaseConnection> | null = null;

export function initDb(): Promise<DatabaseConnection> {
  if (!connectionPromise) {
    connectionPromise = createDatabaseConnection(config.DATABASE_URL);
  }
  return connectionPromise;
}
