import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { resumes, resumeVersions, ResumeRow } from '../db/schema.js';
import { Resume, ResumeStatus } from '@careeros/shared-types';
import { CloudinaryService, UploadResult } from './cloudinary.service.js';
import { NotFoundError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';

const logger = createLogger('resume-service');

export class ResumeService {
  private cloudinary = new CloudinaryService();

  async getLatestResume(userId: string): Promise<Resume | null> {
    const { db } = getDb();
    const rows = await db
      .select()
      .from(resumes)
      .where(and(eq(resumes.userId, userId), eq(resumes.status, ResumeStatus.ACTIVE)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const domain = this.mapToDomain(rows[0]);

    // Ensure fallback local preview endpoint is served if secureUrl contains demo mock URL
    if (domain.secureUrl && domain.secureUrl.includes('demo/image/upload')) {
      domain.secureUrl = `/api/v1/resume/file/${domain.id}`;
    }

    return domain;
  }

  async updateSecureUrl(resumeId: string, secureUrl: string): Promise<void> {
    const { db } = getDb();
    await db.update(resumes).set({ secureUrl }).where(eq(resumes.id, resumeId));
  }

  async saveResume(userId: string, uploadData: UploadResult): Promise<Resume> {
    const { db } = getDb();
    const existing = await this.getLatestResume(userId);

    const now = new Date();
    let row: ResumeRow;

    if (existing) {
      const nextVersion = existing.version + 1;
      const [updated] = await db
        .update(resumes)
        .set({
          publicId: uploadData.publicId,
          secureUrl: uploadData.secureUrl,
          filename: uploadData.filename,
          mimeType: uploadData.mimeType,
          size: uploadData.size,
          version: nextVersion,
          status: ResumeStatus.ACTIVE,
          uploadDate: now,
          updatedAt: now,
        })
        .where(eq(resumes.id, existing.id))
        .returning();

      row = updated;

      // Add to versions history
      await db.insert(resumeVersions).values({
        resumeId: existing.id,
        version: nextVersion,
        publicId: uploadData.publicId,
        secureUrl: uploadData.secureUrl,
        filename: uploadData.filename,
        mimeType: uploadData.mimeType,
        size: uploadData.size,
        createdAt: now,
      });

      logger.info({ userId, resumeId: row.id, version: nextVersion }, 'Updated resume metadata');
    } else {
      const [inserted] = await db
        .insert(resumes)
        .values({
          userId,
          publicId: uploadData.publicId,
          secureUrl: uploadData.secureUrl,
          filename: uploadData.filename,
          mimeType: uploadData.mimeType,
          size: uploadData.size,
          version: 1,
          status: ResumeStatus.ACTIVE,
          uploadDate: now,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      row = inserted;

      await db.insert(resumeVersions).values({
        resumeId: row.id,
        version: 1,
        publicId: uploadData.publicId,
        secureUrl: uploadData.secureUrl,
        filename: uploadData.filename,
        mimeType: uploadData.mimeType,
        size: uploadData.size,
        createdAt: now,
      });

      logger.info({ userId, resumeId: row.id }, 'Created initial resume metadata');
    }

    const domain = this.mapToDomain(row);

    // If Cloudinary returned mock fallback, persist local file preview endpoint in DB
    if (uploadData.secureUrl.includes('demo/image/upload')) {
      const localUrl = `/api/v1/resume/file/${domain.id}`;
      await this.updateSecureUrl(domain.id, localUrl);
      domain.secureUrl = localUrl;
    }

    return domain;
  }

  async deleteResume(userId: string, resumeId?: string): Promise<boolean> {
    const { db } = getDb();
    const active = await this.getLatestResume(userId);

    if (!active) {
      throw new NotFoundError('No active resume found to delete');
    }

    if (resumeId && active.id !== resumeId) {
      throw new NotFoundError('Resume ID mismatch');
    }

    // Delete asset from Cloudinary
    await this.cloudinary.deleteAsset(active.publicId);

    // Delete metadata record from DB
    await db.delete(resumes).where(eq(resumes.id, active.id));

    logger.info({ userId, resumeId: active.id }, 'Deleted resume metadata and asset');
    return true;
  }

  private mapToDomain(row: ResumeRow): Resume {
    return {
      id: row.id,
      userId: row.userId,
      publicId: row.publicId,
      secureUrl: row.secureUrl,
      filename: row.filename,
      mimeType: row.mimeType,
      size: row.size,
      version: row.version,
      status: row.status as ResumeStatus,
      uploadDate: row.uploadDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
