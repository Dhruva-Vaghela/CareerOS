import {
  pgSchema,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { CurrentStatus, ExperienceLevel } from '@careeros/shared-types';

// Profile service owns its own schema — per architecture doc §20.4:
// "One logical schema per service"
export const profileSchema = pgSchema('profile');

export const profiles = profileSchema.table('profiles', {
  // Primary key is userId (1:1 with auth.users) — per architecture doc §6.5
  userId: uuid('user_id').primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull().default(''),
  profilePictureUrl: text('profile_picture_url'),
  country: varchar('country', { length: 100 }),
  timezone: varchar('timezone', { length: 100 }),
  preferredLanguage: varchar('preferred_language', { length: 50 }).notNull().default('en'),
  college: varchar('college', { length: 255 }),
  degree: varchar('degree', { length: 255 }),
  // "education_branch" from architecture doc §6.5
  branch: varchar('branch', { length: 255 }),
  currentSemester: integer('current_semester'),
  // "education_year" from architecture doc §6.5
  graduationYear: integer('graduation_year'),
  currentStatus: varchar('current_status', { length: 50 })
    .$type<CurrentStatus>(),
  // Required — primary personalization input for all downstream modules
  targetRole: varchar('target_role', { length: 255 }).notNull(),
  experienceLevel: varchar('experience_level', { length: 50 })
    .$type<ExperienceLevel>(),
  // Stored as PostgreSQL text array
  interests: text('interests').array().notNull().default([]),
  profileCompleted: boolean('profile_completed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ProfileRow = typeof profiles.$inferSelect;
export type NewProfileRow = typeof profiles.$inferInsert;
