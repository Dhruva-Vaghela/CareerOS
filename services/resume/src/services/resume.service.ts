import { ResumeModel, ResumeVersionModel, IResumeDocument } from '../db/schema.js';
import { Resume, ResumeStatus } from '@careeros/shared-types';
import { CloudinaryService, UploadResult } from './cloudinary.service.js';
import { NotFoundError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';

const logger = createLogger('resume-service');

export class ResumeService {
  private cloudinary = new CloudinaryService();

  async getLatestResume(userId: string): Promise<Resume | null> {
    const doc = await ResumeModel.findOne({
      userId,
      status: ResumeStatus.ACTIVE,
    });

    if (!doc) {
      return null;
    }

    const domain = this.mapToDomain(doc);

    if (domain.secureUrl && domain.secureUrl.includes('demo/image/upload')) {
      domain.secureUrl = `/api/v1/resume/file/${domain.id}`;
    }

    return domain;
  }

  async updateSecureUrl(resumeId: string, secureUrl: string): Promise<void> {
    await ResumeModel.updateOne({ _id: resumeId }, { $set: { secureUrl } });
  }

  async saveResume(userId: string, uploadData: UploadResult): Promise<Resume> {
    const existing = await this.getLatestResume(userId);
    const now = new Date();

    let doc: IResumeDocument;

    if (existing) {
      const nextVersion = existing.version + 1;
      const updatedDoc = await ResumeModel.findOneAndUpdate(
        { _id: existing.id },
        {
          $set: {
            publicId: uploadData.publicId,
            secureUrl: uploadData.secureUrl,
            filename: uploadData.filename,
            mimeType: uploadData.mimeType,
            size: uploadData.size,
            version: nextVersion,
            status: ResumeStatus.ACTIVE,
            uploadDate: now,
            updatedAt: now,
          },
        },
        { new: true, runValidators: true },
      );

      if (!updatedDoc) {
        throw new Error('Failed to update resume document');
      }
      doc = updatedDoc;

      await ResumeVersionModel.create({
        resumeId: existing.id,
        version: nextVersion,
        publicId: uploadData.publicId,
        secureUrl: uploadData.secureUrl,
        filename: uploadData.filename,
        mimeType: uploadData.mimeType,
        size: uploadData.size,
        createdAt: now,
      });

      logger.info({ userId, resumeId: doc.id, version: nextVersion }, 'Updated resume metadata');
    } else {
      doc = await ResumeModel.create({
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
      });

      const resumeIdStr = doc._id.toHexString();

      await ResumeVersionModel.create({
        resumeId: resumeIdStr,
        version: 1,
        publicId: uploadData.publicId,
        secureUrl: uploadData.secureUrl,
        filename: uploadData.filename,
        mimeType: uploadData.mimeType,
        size: uploadData.size,
        createdAt: now,
      });

      logger.info({ userId, resumeId: resumeIdStr }, 'Created initial resume metadata');
    }

    const domain = this.mapToDomain(doc);

    if (uploadData.secureUrl.includes('demo/image/upload')) {
      const localUrl = `/api/v1/resume/file/${domain.id}`;
      await this.updateSecureUrl(domain.id, localUrl);
      domain.secureUrl = localUrl;
    }

    return domain;
  }

  async deleteResume(userId: string, resumeId?: string): Promise<boolean> {
    const active = await this.getLatestResume(userId);

    if (!active) {
      throw new NotFoundError('No active resume found to delete');
    }

    if (resumeId && active.id !== resumeId) {
      throw new NotFoundError('Resume ID mismatch');
    }

    await this.cloudinary.deleteAsset(active.publicId);

    await ResumeModel.deleteOne({ _id: active.id });
    await ResumeVersionModel.deleteMany({ resumeId: active.id });

    logger.info({ userId, resumeId: active.id }, 'Deleted resume metadata and asset');
    return true;
  }

  private mapToDomain(doc: IResumeDocument): Resume {
    return {
      id: doc.id || doc._id.toHexString(),
      userId: doc.userId,
      publicId: doc.publicId,
      secureUrl: doc.secureUrl,
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      version: doc.version,
      status: doc.status as ResumeStatus,
      uploadDate: doc.uploadDate,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
