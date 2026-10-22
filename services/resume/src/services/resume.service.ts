import {
  ResumeModel,
  ResumeVersionModel,
  ResumeExtractionModel,
  ResumeATSModel,
  ResumeSuggestionModel,
  IResumeDocument,
} from '../db/schema.js';
import { Resume, ResumeStatus, ResumeVersion } from '@careeros/shared-types';
import { CloudinaryService, UploadResult } from './cloudinary.service.js';
import { NotFoundError } from '@careeros/errors';
import { createLogger } from '@careeros/logger';

const logger = createLogger('resume-service');

function filenameLabel(filename: string): string {
  const basename = filename.split(/[\\/]/).pop()?.trim() || 'Untitled resume';
  return basename.replace(/\.[^.]+$/, '') || basename;
}

function isGeneratedName(name: string, publicId: string): boolean {
  const normalized = name.trim();
  return !normalized
    || normalized === publicId
    || /^[a-f\d]{24}$/i.test(normalized)
    || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(normalized)
    || /^resume_\d{10,}(?:_|$)/i.test(normalized);
}

export class ResumeService {
  private cloudinary = new CloudinaryService();

  async listResumes(userId: string): Promise<Resume[]> {
    const docs = await ResumeModel.find({ userId }).sort({ updatedAt: -1, createdAt: -1 });
    return docs.map((doc) => this.mapToDomain(doc));
  }

  async getResume(userId: string, resumeId: string): Promise<Resume> {
    const doc = await ResumeModel.findOne({ _id: resumeId, userId });
    if (!doc) throw new NotFoundError('Resume not found');
    return this.mapToDomain(doc);
  }

  async getLatestResume(userId: string): Promise<Resume | null> {
    const doc = await ResumeModel.findOne({ userId, status: ResumeStatus.ACTIVE }).sort({ updatedAt: -1 });
    return doc ? this.mapToDomain(doc) : null;
  }

  async getVersions(userId: string, resumeId: string): Promise<ResumeVersion[]> {
    await this.getResume(userId, resumeId);
    const versions = await ResumeVersionModel.find({ resumeId }).sort({ version: -1 }).lean();
    return versions.map((version) => ({
      id: version._id.toString(),
      resumeId: version.resumeId,
      version: version.version,
      publicId: version.publicId,
      secureUrl: version.secureUrl,
      filename: version.filename,
      mimeType: version.mimeType,
      size: version.size,
      createdAt: version.createdAt,
    }));
  }

  async getVersion(userId: string, resumeId: string, version: number): Promise<ResumeVersion> {
    await this.getResume(userId, resumeId);
    const doc = await ResumeVersionModel.findOne({ resumeId, version }).lean();
    if (!doc) throw new NotFoundError('Resume version not found');
    return {
      id: doc._id.toString(),
      resumeId: doc.resumeId,
      version: doc.version,
      publicId: doc.publicId,
      secureUrl: doc.secureUrl,
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      createdAt: doc.createdAt,
    };
  }

  async createResume(userId: string, uploadData: UploadResult, name?: string): Promise<Resume> {
    const now = new Date();
    const doc = await ResumeModel.create({
      userId,
      name: name?.trim() || filenameLabel(uploadData.filename),
      ...uploadData,
      version: 1,
      status: ResumeStatus.ACTIVE,
      uploadDate: now,
      createdAt: now,
      updatedAt: now,
    });
    const resumeId = doc._id.toHexString();
    await ResumeVersionModel.create({ resumeId, version: 1, ...uploadData, createdAt: now });
    logger.info({ userId, resumeId }, 'Created resume');
    return this.mapToDomain(doc);
  }

  async appendVersion(userId: string, resumeId: string, uploadData: UploadResult): Promise<Resume> {
    const existing = await ResumeModel.findOne({ _id: resumeId, userId });
    if (!existing) throw new NotFoundError('Resume not found');
    const now = new Date();
    const nextVersion = existing.version + 1;
    const updated = await ResumeModel.findOneAndUpdate(
      { _id: resumeId, userId, version: existing.version },
      { $set: { ...uploadData, version: nextVersion, status: ResumeStatus.ACTIVE, uploadDate: now, updatedAt: now } },
      { new: true, runValidators: true },
    );
    if (!updated) throw new Error('Resume changed while adding a version; retry the upload');
    await ResumeVersionModel.create({ resumeId, version: nextVersion, ...uploadData, createdAt: now });
    logger.info({ userId, resumeId, version: nextVersion }, 'Added resume version');
    return this.mapToDomain(updated);
  }

  async updateResume(userId: string, resumeId: string, changes: { name?: string; status?: ResumeStatus }): Promise<Resume> {
    const doc = await ResumeModel.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: { ...changes, updatedAt: new Date() } },
      { new: true, runValidators: true },
    );
    if (!doc) throw new NotFoundError('Resume not found');
    return this.mapToDomain(doc);
  }

  async deleteResume(userId: string, resumeId: string): Promise<boolean> {
    const resume = await ResumeModel.findOne({ _id: resumeId, userId }).lean();
    if (!resume) throw new NotFoundError('Resume not found');
    const versions = await ResumeVersionModel.find({ resumeId }).lean();
    const publicIds = new Set([resume.publicId, ...versions.map((version) => version.publicId)]);
    await Promise.all([...publicIds].map((publicId) => this.cloudinary.deleteAsset(publicId)));
    await Promise.all([
      ResumeModel.deleteOne({ _id: resumeId, userId }),
      ResumeVersionModel.deleteMany({ resumeId }),
      ResumeExtractionModel.deleteMany({ resumeId }),
      ResumeATSModel.deleteMany({ resumeId }),
      ResumeSuggestionModel.deleteMany({ resumeId }),
    ]);
    logger.info({ userId, resumeId }, 'Deleted resume and its versions');
    return true;
  }

  async updateSecureUrl(resumeId: string, version: number, secureUrl: string): Promise<void> {
    await Promise.all([
      ResumeModel.updateOne({ _id: resumeId, version }, { $set: { secureUrl } }),
      ResumeVersionModel.updateOne({ resumeId, version }, { $set: { secureUrl } }),
    ]);
  }

  private mapToDomain(doc: IResumeDocument): Resume {
    const storedName = doc.name || '';
    return {
      id: doc.id || doc._id.toHexString(),
      userId: doc.userId,
      name: isGeneratedName(storedName, doc.publicId) ? filenameLabel(doc.filename) : storedName,
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
