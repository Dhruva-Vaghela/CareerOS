export declare const healthCheckSchema: import("drizzle-orm/pg-core").PgSchema<"health_check">;
export declare const systemChecks: import("drizzle-orm/pg-core").PgTableWithColumns<{
    name: "system_checks";
    schema: "health_check";
    columns: {
        id: import("drizzle-orm/pg-core").PgColumn<{
            name: "id";
            tableName: "system_checks";
            dataType: "string";
            columnType: "PgUUID";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
        status: import("drizzle-orm/pg-core").PgColumn<{
            name: "status";
            tableName: "system_checks";
            dataType: "string";
            columnType: "PgVarchar";
            data: string;
            driverParam: string;
            notNull: true;
            hasDefault: false;
            enumValues: [string, ...string[]];
            baseColumn: never;
        }, {}, {}>;
        checkedAt: import("drizzle-orm/pg-core").PgColumn<{
            name: "checked_at";
            tableName: "system_checks";
            dataType: "date";
            columnType: "PgTimestamp";
            data: Date;
            driverParam: string;
            notNull: true;
            hasDefault: true;
            enumValues: undefined;
            baseColumn: never;
        }, {}, {}>;
    };
    dialect: "pg";
}>;
export type SystemCheck = typeof systemChecks.$inferSelect;
export type NewSystemCheck = typeof systemChecks.$inferInsert;
//# sourceMappingURL=schema.d.ts.map