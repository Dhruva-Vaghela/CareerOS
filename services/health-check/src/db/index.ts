import { createDatabaseConnection, DatabaseConnection } from '@careeros/database';
import { config } from '../config.js';
import * as schema from './schema.js';

let connection: DatabaseConnection<typeof schema> | null = null;

export function getDb(): DatabaseConnection<typeof schema> {
  if (!connection) {
    connection = createDatabaseConnection(config.DATABASE_URL, {}, schema);
  }
  return connection;
}
