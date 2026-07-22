import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
export interface DatabaseConnection<TSchema extends Record<string, unknown> = Record<string, unknown>> {
    db: NodePgDatabase<TSchema>;
    pool: pg.Pool;
}
export declare function createDatabaseConnection<TSchema extends Record<string, unknown> = Record<string, unknown>>(connectionString: string, options?: pg.PoolConfig, schema?: TSchema): DatabaseConnection<TSchema>;
export declare function testConnection(pool: pg.Pool): Promise<boolean>;
//# sourceMappingURL=index.d.ts.map