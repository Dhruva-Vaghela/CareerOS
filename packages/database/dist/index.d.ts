import mongoose from 'mongoose';
export interface DatabaseConnection {
    connection: mongoose.Connection;
    mongoose: typeof mongoose;
}
export declare function createDatabaseConnection(connectionString: string, options?: mongoose.ConnectOptions): Promise<DatabaseConnection>;
export declare function testConnection(conn?: mongoose.Connection): Promise<boolean>;
export declare function disconnectDatabase(): Promise<void>;
export { mongoose };
//# sourceMappingURL=index.d.ts.map