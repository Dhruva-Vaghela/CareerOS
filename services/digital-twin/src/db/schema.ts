import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core';
import {
  TwinNodeType,
  VerificationStatus,
  ConfidenceLevel,
} from '@careeros/shared-types';

export const digitalTwinSchema = pgSchema('digital_twin');

export const digitalTwins = digitalTwinSchema.table('digital_twins', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().unique(),
  status: varchar('status', { length: 50 }).notNull().default('ACTIVE'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const twinNodes = digitalTwinSchema.table('twin_nodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  twinId: uuid('twin_id')
    .notNull()
    .references(() => digitalTwins.id, { onDelete: 'cascade' }),
  nodeType: varchar('node_type', { length: 100 })
    .$type<TwinNodeType>()
    .notNull(),
  source: varchar('source', { length: 100 }).notNull(),
  verificationStatus: varchar('verification_status', { length: 50 })
    .$type<VerificationStatus>()
    .notNull()
    .default(VerificationStatus.UNVERIFIED),
  confidenceScore: varchar('confidence_score', { length: 50 })
    .$type<ConfidenceLevel>()
    .notNull()
    .default(ConfidenceLevel.MEDIUM),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata').notNull().default({}),
});

export type DigitalTwinRow = typeof digitalTwins.$inferSelect;
export type NewDigitalTwinRow = typeof digitalTwins.$inferInsert;
export type TwinNodeRow = typeof twinNodes.$inferSelect;
export type NewTwinNodeRow = typeof twinNodes.$inferInsert;
