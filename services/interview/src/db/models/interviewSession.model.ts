import mongoose, { Schema, Document } from 'mongoose';
import { InterviewMode, InterviewSessionStatus } from '@careeros/shared-types';

export interface IInterviewSessionDoc extends Document {
  userId: string;
  mode: InterviewMode;
  status: InterviewSessionStatus;
  companyProfileId?: string;
  companyName?: string;
  jobRole?: string;
  experienceLevel?: string;
  roundType?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  overallScore?: number;
  contextSnapshot?: string; // Only for PRACTICE mode
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewSessionSchema = new Schema<IInterviewSessionDoc>(
  {
    userId: { type: String, required: true, index: true },
    mode: {
      type: String,
      enum: Object.values(InterviewMode),
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(InterviewSessionStatus),
      default: InterviewSessionStatus.IN_PROGRESS,
      index: true,
    },
    companyProfileId: { type: String, index: true },
    companyName: { type: String, index: true },
    jobRole: { type: String, index: true },
    experienceLevel: { type: String },
    roundType: { type: String, index: true },
    currentQuestionIndex: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 5 },
    overallScore: { type: Number },
    contextSnapshot: { type: String },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

export const InterviewSessionModel = mongoose.model<IInterviewSessionDoc>(
  'InterviewSession',
  InterviewSessionSchema,
);
