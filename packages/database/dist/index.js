import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { createLogger } from '@careeros/logger';
const logger = createLogger('database-client');
export function createDatabaseConnection(connectionString, options = {}, schema) {
    logger.info('Initializing PostgreSQL connection pool...');
    const pool = new pg.Pool({
        connectionString,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ...options,
    });
    pool.on('error', (err) => {
        logger.error({ err }, 'Unexpected error on idle database client');
    });
    const db = drizzle(pool, schema ? { schema } : undefined);
    return { db, pool };
}
export async function testConnection(pool) {
    try {
        const client = await pool.connect();
        await client.query('SELECT 1');
        client.release();
        logger.info('Database connectivity test succeeded');
        return true;
    }
    catch (error) {
        logger.error({ err: error }, 'Database connectivity test failed');
        return false;
    }
}
//# sourceMappingURL=index.js.map