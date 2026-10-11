import mongoose, { Schema, Document } from 'mongoose';
import { ProjectStatus } from '@careeros/shared-types';

export interface IProjectDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  githubRepoId?: number;
  name: string;
  fullName?: string;
  description: string;
  repositoryUrl: string;
  language?: string | null;
  topics: string[];
  stars: number;
  forks: number;
  status: 'Completed' | 'In Progress' | 'Active' | 'Archived';
  isPublic: boolean;
  defaultBranch?: string;
  lastSyncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProjectDocument>(
  {
    userId: { type: String, required: true, index: true },
    githubRepoId: { type: Number },
    name: { type: String, required: true },
    fullName: { type: String },
    description: { type: String, default: '' },
    repositoryUrl: { type: String, required: true },
    language: { type: String, default: null },
    topics: { type: [String], default: [] },
    stars: { type: Number, default: 0 },
    forks: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['Completed', 'In Progress', 'Active', 'Archived'],
      default: 'Completed',
    },
    isPublic: { type: Boolean, default: true },
    defaultBranch: { type: String, default: 'main' },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

projectSchema.index({ userId: 1, githubRepoId: 1 }, { unique: true, sparse: true });
projectSchema.index({ userId: 1, name: 1 });

export const ProjectModel =
  mongoose.models.Project || mongoose.model<IProjectDocument>('Project', projectSchema);

export interface IProjectGithubAccountDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  githubUsername: string;
  githubUserId?: number;
  avatarUrl?: string;
  profileUrl?: string;
  accessToken?: string;
  publicRepoCount: number;
  connectedAt: Date;
  lastSyncedAt: Date;
}

const githubAccountSchema = new Schema<IProjectGithubAccountDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    githubUsername: { type: String, required: true },
    githubUserId: { type: Number },
    avatarUrl: { type: String },
    profileUrl: { type: String },
    accessToken: { type: String },
    publicRepoCount: { type: Number, default: 0 },
    connectedAt: { type: Date, default: Date.now },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const ProjectGithubAccountModel =
  mongoose.models.ProjectGithubAccount ||
  mongoose.model<IProjectGithubAccountDocument>('ProjectGithubAccount', githubAccountSchema);

export interface IProjectBriefDocument extends Document {
  _id: mongoose.Types.ObjectId;
  moduleId: string;
  title: string;
  description: string;
  createdAt: Date;
}

const projectBriefSchema = new Schema<IProjectBriefDocument>(
  {
    moduleId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const ProjectBriefModel =
  mongoose.models.ProjectBrief ||
  mongoose.model<IProjectBriefDocument>('ProjectBrief', projectBriefSchema);

export interface IProjectSubmissionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  projectBriefId: string;
  submissionUrl: string;
  status: ProjectStatus;
  submittedAt: Date;
}

const projectSubmissionSchema = new Schema<IProjectSubmissionDocument>(
  {
    userId: { type: String, required: true, index: true },
    projectBriefId: { type: String, required: true, index: true },
    submissionUrl: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(ProjectStatus),
      default: ProjectStatus.SUBMITTED,
    },
    submittedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const ProjectSubmissionModel =
  mongoose.models.ProjectSubmission ||
  mongoose.model<IProjectSubmissionDocument>('ProjectSubmission', projectSubmissionSchema);
