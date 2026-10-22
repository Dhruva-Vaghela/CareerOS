import mongoose, { Schema, Document } from 'mongoose';
import { ResumeStatus } from '@careeros/shared-types';

export interface IResumeDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  name: string;
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
  version: number;
  status: 'COMPLETED' | 'FAILED';
  parsedContent: {
    plainText?: string;
    wordCount?: number;
    pageCount?: number;
    sections?: Record<string, string>;
    source?: 'TEXT' | 'OCR';
    layout?: 'SINGLE_COLUMN' | 'TABLE_OR_COLUMNS' | 'UNCERTAIN';
    warnings?: string[];
  };
  errorMessage?: string;
  createdAt: Date;
}

export interface IResumeATSDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  version: number;
  score: number;
  targetRole?: string;
  jobDescription?: string;
  hasJobDescription: boolean;
  criteriaHash?: string;
  breakdown: {
    targeted: boolean;
    matchedKeywords: string[];
    missingKeywords: string[];
    simulation?: {
      stages: Array<{ id: string; label: string; status: 'PASS' | 'REVIEW' | 'FAIL'; detail: string }>;
      decision: 'LIKELY_ADVANCE' | 'NEEDS_REVIEW' | 'LIKELY_FILTERED';
      confidence: 'LOW' | 'MEDIUM';
      requiredMatches: string[];
      requiredGaps: string[];
      preferredMatches: string[];
      preferredGaps: string[];
      explicitRules: Array<{ label: string; status: 'PASS' | 'REVIEW' | 'FAIL'; detail: string }>;
      requirements: { requiredSkills: string[]; minimumYearsExperience?: number; requiredEducation?: string; requiredLocation?: string };
      ranking: { required: { matched: number; total: number; percentage: number }; preferred: { matched: number; total: number; percentage: number }; general: { matched: number; total: number; percentage: number }; role: { matched: number; total: number; percentage: number }; weightedPercentage: number };
    };
    categories: Array<{
      id: string;
      label: string;
      score: number;
      maxScore: number;
      findings: string[];
    }>;
  };
  createdAt: Date;
}

export interface IResumeSuggestionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  resumeId: string;
  version: number;
  status: 'COMPLETED' | 'FAILED';
  targetRole?: string;
  hasJobDescription: boolean;
  inputHash: string;
  summary?: string;
  strengths: Array<{ title: string; evidence: string; whyItMatters: string }>;
  weaknesses: Array<{ title: string; evidence: string; whyItMatters: string }>;
  suggestions: Array<{ priority: 'HIGH' | 'MEDIUM' | 'LOW'; issue: string; action: string; exampleRewrite?: string }>;
  recruiterFeedback?: { firstImpression: string; concerns: string[]; recommendation: string };
  errorMessage?: string;
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
    name: { type: String, required: true, trim: true },
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
  version: { type: Number, required: true },
  status: { type: String, enum: ['COMPLETED', 'FAILED'], required: true },
  parsedContent: { type: Schema.Types.Mixed, default: {} },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});
resumeExtractionSchema.index({ resumeId: 1, version: 1 }, { unique: true });

const resumeATSSchema = new Schema<IResumeATSDocument>({
  resumeId: { type: String, required: true, index: true },
  version: { type: Number, required: true },
  score: { type: Number, required: true },
  targetRole: { type: String },
  jobDescription: { type: String },
  hasJobDescription: { type: Boolean, required: true, default: false },
  criteriaHash: { type: String },
  breakdown: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});
resumeATSSchema.index({ resumeId: 1, version: 1, createdAt: -1 });

const resumeSuggestionSchema = new Schema<IResumeSuggestionDocument>({
  resumeId: { type: String, required: true, index: true },
  version: { type: Number, required: true },
  status: { type: String, enum: ['COMPLETED', 'FAILED'], required: true },
  targetRole: { type: String },
  hasJobDescription: { type: Boolean, required: true, default: false },
  inputHash: { type: String, required: true },
  summary: { type: String },
  strengths: { type: [Schema.Types.Mixed], default: [] },
  weaknesses: { type: [Schema.Types.Mixed], default: [] },
  suggestions: { type: [Schema.Types.Mixed], default: [] },
  recruiterFeedback: { type: Schema.Types.Mixed },
  errorMessage: { type: String },
  createdAt: { type: Date, default: Date.now },
});
resumeSuggestionSchema.index({ resumeId: 1, version: 1, createdAt: -1 });

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
  name: string;
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
