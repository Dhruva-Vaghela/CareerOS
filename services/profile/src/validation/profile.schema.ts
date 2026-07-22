import { z } from 'zod';
import { CurrentStatus, ExperienceLevel, TargetJobRole } from '@careeros/shared-types';

// All known target roles — used for validation suggestions, but also allows custom "Other" values
const targetJobRoleValues = Object.values(TargetJobRole) as [string, ...string[]];
const currentStatusValues = Object.values(CurrentStatus) as [string, ...string[]];
const experienceLevelValues = Object.values(ExperienceLevel) as [string, ...string[]];

// Schema for creating/completing a profile during onboarding (PUT /profile)
export const createProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(255),
  profilePictureUrl: z.string().url('Invalid URL').optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  preferredLanguage: z.string().max(50).default('en'),
  college: z.string().max(255).optional().nullable(),
  degree: z.string().max(255).optional().nullable(),
  branch: z.string().max(255).optional().nullable(),
  currentSemester: z.number().int().min(1).max(12).optional().nullable(),
  graduationYear: z.number().int().min(2000).max(2040).optional().nullable(),
  currentStatus: z.enum(currentStatusValues).optional().nullable(),
  // targetRole is required — primary personalization input for all downstream modules
  targetRole: z.string().min(1, 'Target job role is required').max(255),
  experienceLevel: z.enum(experienceLevelValues).optional().nullable(),
  interests: z.array(z.string().max(100)).max(20).default([]),
});

// Schema for partial profile updates (PATCH /profile)
export const updateProfileSchema = z.object({
  fullName: z.string().min(1, 'Full name cannot be empty').max(255).optional(),
  profilePictureUrl: z.string().url('Invalid URL').optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  timezone: z.string().max(100).optional().nullable(),
  preferredLanguage: z.string().max(50).optional(),
  college: z.string().max(255).optional().nullable(),
  degree: z.string().max(255).optional().nullable(),
  branch: z.string().max(255).optional().nullable(),
  currentSemester: z.number().int().min(1).max(12).optional().nullable(),
  graduationYear: z.number().int().min(2000).max(2040).optional().nullable(),
  currentStatus: z.enum(currentStatusValues).optional().nullable(),
  targetRole: z.string().min(1, 'Target job role cannot be empty').max(255).optional(),
  experienceLevel: z.enum(experienceLevelValues).optional().nullable(),
  interests: z.array(z.string().max(100)).max(20).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
);
