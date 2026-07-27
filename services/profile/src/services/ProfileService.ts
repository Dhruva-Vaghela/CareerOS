import { ProfileModel, ProfileRow, IProfileDocument } from '../db/schema.js';
import { AvailabilityTimeframe } from '@careeros/shared-types';
import { NotFoundError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';
import { eventBus } from '../bus.js';
import crypto from 'crypto';

const logger = createLogger('profile-service');

const REQUIRED_COMPLETION_FIELDS = ['fullName', 'targetRole'] as const;

export class ProfileService {
  private isProfileComplete(data: Partial<ProfileRow>): boolean {
    return !!(
      data.fullName && data.fullName.trim().length > 0 &&
      data.targetRole && data.targetRole.trim().length > 0
    );
  }

  getCompletionInfo(profile: ProfileRow): { percentage: number; missingFields: string[]; isComplete: boolean } {
    const missingFields: string[] = [];
    if (!profile.fullName || profile.fullName.trim().length === 0) missingFields.push('fullName');
    if (!profile.targetRole || profile.targetRole.trim().length === 0) missingFields.push('targetRole');

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

    const requiredScore = ((REQUIRED_COMPLETION_FIELDS.length - missingFields.length) / REQUIRED_COMPLETION_FIELDS.length) * 60;
    const optionalScore = (filledOptional / optionalFields.length) * 40;
    const percentage = Math.round(requiredScore + optionalScore);

    return {
      percentage,
      missingFields,
      isComplete: missingFields.length === 0,
    };
  }

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
    availabilityHours?: number | null;
    availabilityTimeframe?: string | null;
    interests?: string[];
  }): Promise<ProfileRow> {
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
      availabilityHours: data.availabilityHours ?? null,
      availabilityTimeframe: (data.availabilityTimeframe as AvailabilityTimeframe) ?? null,
      interests: data.interests ?? [],
      profileCompleted,
      updatedAt: new Date(),
    };

    const doc = await ProfileModel.findOneAndUpdate(
      { userId },
      { $set: values, $setOnInsert: { createdAt: new Date() } },
      { upsert: true, new: true, runValidators: true },
    );

    if (!doc) {
      throw new Error('Failed to create or replace profile document');
    }

    const profileRow = this.mapToRow(doc);

    logger.info({ userId, profileCompleted }, 'Profile created/replaced');

    await this.publishProfileUpdatedEvent(userId, profileRow);

    return profileRow;
  }

  async getProfile(userId: string): Promise<ProfileRow | null> {
    const doc = await ProfileModel.findOne({ userId });
    return doc ? this.mapToRow(doc) : null;
  }

  async updateProfile(userId: string, data: Record<string, unknown>): Promise<ProfileRow> {
    const existing = await this.getProfile(userId);
    if (!existing) {
      throw new NotFoundError('Profile not found. Complete onboarding first.');
    }

    const merged = { ...existing, ...data };
    const profileCompleted = this.isProfileComplete(merged as Partial<ProfileRow>);

    const doc = await ProfileModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...data,
          profileCompleted,
          updatedAt: new Date(),
        },
      },
      { new: true, runValidators: true },
    );

    if (!doc) {
      throw new NotFoundError('Profile not found for update.');
    }

    const updatedRow = this.mapToRow(doc);

    logger.info({ userId, profileCompleted }, 'Profile updated');

    await this.publishProfileUpdatedEvent(userId, updatedRow);

    return updatedRow;
  }

  private mapToRow(doc: IProfileDocument): ProfileRow {
    return {
      userId: doc.userId,
      fullName: doc.fullName,
      profilePictureUrl: doc.profilePictureUrl,
      country: doc.country,
      timezone: doc.timezone,
      preferredLanguage: doc.preferredLanguage,
      college: doc.college,
      degree: doc.degree,
      branch: doc.branch,
      currentSemester: doc.currentSemester,
      graduationYear: doc.graduationYear,
      currentStatus: doc.currentStatus,
      targetRole: doc.targetRole,
      experienceLevel: doc.experienceLevel,
      availabilityHours: doc.availabilityHours,
      availabilityTimeframe: doc.availabilityTimeframe,
      interests: doc.interests || [],
      profileCompleted: doc.profileCompleted,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

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
