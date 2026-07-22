import { pgSchema, uuid, varchar, timestamp, text } from 'drizzle-orm/pg-core';
import { UserStatus } from '@careeros/shared-types';

export const authSchema = pgSchema('auth');

export const users = authSchema.table('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  authProvider: varchar('auth_provider', { length: 50 }).notNull().default('LOCAL'),
  status: varchar('status', { length: 50 }).$type<UserStatus>().notNull().default(UserStatus.ACTIVE),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const sessions = authSchema.table('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
});

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;

export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
