import { createDatabaseConnection } from '@careeros/database';
import { config } from '../config.js';
let connectionPromise = null;
export async function initDb() {
    if (!connectionPromise) {
        connectionPromise = createDatabaseConnection(config.DATABASE_URL);
    }
    return connectionPromise;
}
export function getDb() {
    return {
        initDb,
    };
}
//# sourceMappingURL=index.js.map