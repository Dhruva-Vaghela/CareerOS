import { pgSchema, uuid, varchar, timestamp } from 'drizzle-orm/pg-core';

// Define a dedicated schema for isolated boundaries
export const healthCheckSchema = pgSchema('health_check');

export const systemChecks = healthCheckSchema.table('system_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  status: varchar('status', { length: 50 }).notNull(),
  checkedAt: timestamp('checked_at').defaultNow().notNull(),
});

export type SystemCheck = typeof systemChecks.$inferSelect;
export type NewSystemCheck = typeof systemChecks.$inferInsert;
