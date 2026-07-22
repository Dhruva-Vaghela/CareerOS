import { createDatabaseConnection } from '@careeros/database';
import { config } from '../config.js';
import * as schema from './schema.js';
let connection = null;
export function getDb() {
    if (!connection) {
        connection = createDatabaseConnection(config.DATABASE_URL, {}, schema);
    }
    return connection;
}
//# sourceMappingURL=index.js.map