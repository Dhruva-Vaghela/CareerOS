import { eq } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { NotFoundError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import { eventBus } from '../bus.js';
import crypto from 'crypto';
import type { ProfileRow } from '../db/schema.js';

const logger = createLogger('profile-service');

// Fields required for a profile to be considered "complete" for onboarding
const REQUIRED_COMPLETION_FIELDS = ['fullName', 'targetRole'] as const;

export class ProfileService {

  /**
   * Determines if a profile has all required fields filled to be considered complete.
   * targetRole is mandatory because it drives all downstream personalization.
   */
  private isProfileComplete(data: Partial<ProfileRow>): boolean {
    return !!(
      data.fullName && data.fullName.trim().length > 0 &&
      data.targetRole && data.targetRole.trim().length > 0
    );
  }

  /**
   * Returns completion percentage and list of missing required fields.
   */
  getCompletionInfo(profile: ProfileRow): { percentage: number; missingFields: string[]; isComplete: boolean } {
    const missingFields: string[] = [];
    if (!profile.fullName || profile.fullName.trim().length === 0) missingFields.push('fullName');
    if (!profile.targetRole || profile.targetRole.trim().length === 0) missingFields.push('targetRole');

    // Optional but valuable fields for better personalization
    const optionalFields = [
      'country', 'timezone', 'college', 'degree', 'branch',
      'currentStatus', 'experienceLevel',
    ] as const;

    let filledOptional = 0;
    for (const field of optionalFields) {
      if (profile[field] && String(profile[field]).trim().length > 0) {
        filledOptional++;
      }
    }

    // Required fields are worth 60%, optional fields share the remaining 40%
    const requiredScore = ((REQUIRED_COMPLETION_FIELDS.length - missingFields.length) / REQUIRED_COMPLETION_FIELDS.length) * 60;
    const optionalScore = (filledOptional / optionalFields.length) * 40;
    const percentage = Math.round(requiredScore + optionalScore);

    return {
      percentage,
      missingFields,
      isComplete: missingFields.length === 0,
    };
  }

  /**
   * Creates or replaces a user's profile. Used during onboarding (PUT).
   * Every authenticated user has exactly one profile keyed by userId.
   */
  async createOrReplaceProfile(userId: string, data: {
    fullName: string;
    profilePictureUrl?: string | null;
    country?: string | null;
    timezone?: string | null;
    preferredLanguage?: string;
    college?: string | null;
    degree?: string | null;
    branch?: string | null;
    currentSemester?: number | null;
    graduationYear?: number | null;
    currentStatus?: string | null;
    targetRole: string;
    experienceLevel?: string | null;
    interests?: string[];
  }): Promise<ProfileRow> {
    const { db } = getDb();

    const profileCompleted = this.isProfileComplete(data as Partial<ProfileRow>);

    const values = {
      userId,
      fullName: data.fullName,
      profilePictureUrl: data.profilePictureUrl ?? null,
      country: data.country ?? null,
      timezone: data.timezone ?? null,
      preferredLanguage: data.preferredLanguage ?? 'en',
      college: data.college ?? null,
      degree: data.degree ?? null,
      branch: data.branch ?? null,
      currentSemester: data.currentSemester ?? null,
      graduationYear: data.graduationYear ?? null,
      currentStatus: data.currentStatus ?? null,
      targetRole: data.targetRole,
      experienceLevel: data.experienceLevel ?? null,
      interests: data.interests ?? [],
      profileCompleted,
      updatedAt: new Date(),
    };

    // Upsert: insert or update on conflict (userId is PK)
    const [profile] = await db
      .insert(profiles)
      .values(values)
      .onConflictDoUpdate({
        target: profiles.userId,
        set: {
          ...values,
          // Don't overwrite createdAt on update
          userId: undefined,
        },
      })
      .returning();

    logger.info({ userId, profileCompleted }, 'Profile created/replaced');

    // Publish profile.updated event — per architecture doc §6.7
    await this.publishProfileUpdatedEvent(userId, profile);

    return profile;
  }

  /**
   * Retrieves a user's profile by userId.
   */
  async getProfile(userId: string): Promise<ProfileRow | null> {
    const { db } = getDb();
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return profile ?? null;
  }

  /**
   * Partially updates a user's profile (PATCH).
   * Only provided fields are updated; completion status is recalculated.
   */
  async updateProfile(userId: string, data: Record<string, unknown>): Promise<ProfileRow> {
    const { db } = getDb();

    // Verify profile exists
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new NotFoundError('Profile not found. Complete onboarding first.');
    }

    // Merge existing with updates to check completion
    const merged = { ...existing, ...data };
    const profileCompleted = this.isProfileComplete(merged as Partial<ProfileRow>);

    const [updated] = await db
      .update(profiles)
      .set({
        ...data,
        profileCompleted,
        updatedAt: new Date(),
      })
      .where(eq(profiles.userId, userId))
      .returning();

    logger.info({ userId, profileCompleted }, 'Profile updated');

    // Publish profile.updated event — per architecture doc §6.7
    await this.publishProfileUpdatedEvent(userId, updated);

    return updated;
  }

  /**
   * Publishes profile.updated event to the event bus.
   * Per architecture doc §20.1, this event is consumed by the Career Digital Twin.
   */
  private async publishProfileUpdatedEvent(userId: string, profile: ProfileRow): Promise<void> {
    await eventBus.publish({
      name: 'profile.updated',
      metadata: {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        traceId: `profile-update-${userId}`,
        userId,
      },
      payload: {
        userId,
        profile: {
          fullName: profile.fullName,
          targetRole: profile.targetRole,
          branch: profile.branch,
          graduationYear: profile.graduationYear,
          interests: profile.interests,
          currentStatus: profile.currentStatus,
          experienceLevel: profile.experienceLevel,
          profileCompleted: profile.profileCompleted,
        },
      },
    });
  }
}
