import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  text,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { CareerGoalStatus } from '@careeros/shared-types';

export const careerGoalsSchema = pgSchema('career_goals');

export const careerGoals = careerGoalsSchema.table('career_goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  targetRole: varchar('target_role', { length: 255 }).notNull(),
  targetCompanies: text('target_companies')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  timeline: varchar('timeline', { length: 50 }).notNull(),
  customTimeline: varchar('custom_timeline', { length: 100 }),
  status: varchar('status', { length: 50 })
    .$type<CareerGoalStatus>()
    .notNull()
    .default(CareerGoalStatus.ACTIVE),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type CareerGoalRow = typeof careerGoals.$inferSelect;
export type NewCareerGoalRow = typeof careerGoals.$inferInsert;
