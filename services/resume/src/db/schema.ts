import mongoose, { Schema, Document } from 'mongoose';
import { ResumeStatus } from '@careeros/shared-types';

export interface IResumeDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  publicId: string;
  secureUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  version: number;
  status: ResumeStatus;
  uploadDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IResumeVersionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  version: number;
  publicId: string;
  secureUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface IResumeExtractionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  parsedContent: Record<string, unknown>;
  createdAt: Date;
}

export interface IResumeATSDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  score: number;
  breakdown: Record<string, unknown>;
  createdAt: Date;
}

export interface IResumeSuggestionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  suggestions: string[];
  createdAt: Date;
}

export interface IResumeAuditDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  action: string;
  performedBy: string;
  createdAt: Date;
}

const resumeSchema = new Schema<IResumeDocument>(
  {
    userId: { type: String, required: true, index: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    version: { type: Number, required: true, default: 1 },
    status: {
      type: String,
      enum: Object.values(ResumeStatus),
      required: true,
      default: ResumeStatus.ACTIVE,
    },
    uploadDate: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

resumeSchema.virtual('id').get(function (this: IResumeDocument) {
  return this._id.toHexString();
});

resumeSchema.index({ userId: 1, status: 1 });

const resumeVersionSchema = new Schema<IResumeVersionDocument>(
  {
    resumeId: { type: String, required: true, index: true },
    version: { type: Number, required: true },
    publicId: { type: String, required: true },
    secureUrl: { type: String, required: true },
    filename: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

resumeVersionSchema.virtual('id').get(function (this: IResumeVersionDocument) {
  return this._id.toHexString();
});

resumeVersionSchema.index({ resumeId: 1, version: -1 });

const resumeExtractionSchema = new Schema<IResumeExtractionDocument>({
  resumeId: { type: String, required: true, index: true },
  parsedContent: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

const resumeATSSchema = new Schema<IResumeATSDocument>({
  resumeId: { type: String, required: true, index: true },
  score: { type: Number, required: true },
  breakdown: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

const resumeSuggestionSchema = new Schema<IResumeSuggestionDocument>({
  resumeId: { type: String, required: true, index: true },
  suggestions: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const resumeAuditSchema = new Schema<IResumeAuditDocument>({
  resumeId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  performedBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const ResumeModel =
  mongoose.models.Resume || mongoose.model<IResumeDocument>('Resume', resumeSchema, 'Resumes');

export const ResumeVersionModel =
  mongoose.models.ResumeVersion ||
  mongoose.model<IResumeVersionDocument>('ResumeVersion', resumeVersionSchema, 'ResumeVersions');

export const ResumeExtractionModel =
  mongoose.models.ResumeExtraction ||
  mongoose.model<IResumeExtractionDocument>('ResumeExtraction', resumeExtractionSchema, 'ResumeExtractions');

export const ResumeATSModel =
  mongoose.models.ResumeATS || mongoose.model<IResumeATSDocument>('ResumeATS', resumeATSSchema, 'ResumeATS');

export const ResumeSuggestionModel =
  mongoose.models.ResumeSuggestion ||
  mongoose.model<IResumeSuggestionDocument>('ResumeSuggestion', resumeSuggestionSchema, 'ResumeSuggestions');

export const ResumeAuditModel =
  mongoose.models.ResumeAudit ||
  mongoose.model<IResumeAuditDocument>('ResumeAudit', resumeAuditSchema, 'ResumeAudits');

export type ResumeRow = {
  id: string;
  userId: string;
  publicId: string;
  secureUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  version: number;
  status: ResumeStatus;
  uploadDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ResumeVersionRow = {
  id: string;
  resumeId: string;
  version: number;
  publicId: string;
  secureUrl: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: Date;
};
