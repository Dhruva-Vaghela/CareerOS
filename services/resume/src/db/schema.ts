import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core';
import { ResumeStatus } from '@careeros/shared-types';

export const resumeSchema = pgSchema('resume');

export const resumes = resumeSchema.table('resumes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  publicId: text('public_id').notNull(),
  secureUrl: text('secure_url').notNull(),
  filename: text('filename').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  version: integer('version').notNull().default(1),
  status: varchar('status', { length: 50 })
    .$type<ResumeStatus>()
    .notNull()
    .default(ResumeStatus.ACTIVE),
  uploadDate: timestamp('upload_date').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const resumeVersions = resumeSchema.table('resume_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  resumeId: uuid('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  version: integer('version').notNull(),
  publicId: text('public_id').notNull(),
  secureUrl: text('secure_url').notNull(),
  filename: text('filename').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type ResumeRow = typeof resumes.$inferSelect;
export type NewResumeRow = typeof resumes.$inferInsert;
export type ResumeVersionRow = typeof resumeVersions.$inferSelect;
export type NewResumeVersionRow = typeof resumeVersions.$inferInsert;
