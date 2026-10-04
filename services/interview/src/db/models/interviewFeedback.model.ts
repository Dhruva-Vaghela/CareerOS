import mongoose, { Schema, Document } from 'mongoose';
import { HiringDecision } from '@careeros/shared-types';

export interface IQuestionFeedbackItem {
  questionId?: string;
  order: number;
  questionText: string;
  category?: string;
  difficulty?: string;
  userResponse: string;
  score: number;
  feedback: string;
  expectedCriteria: string[];
  missedCriteria: string[];
  strengths: string[];
  technicalAccuracy?: number;
  communicationClarity?: number;
}

export interface IInterviewFeedbackDoc extends Document {
  sessionId: string;
  userId: string;
  summary: string;
  overallScore: number;
  hiringDecision: HiringDecision | string;
  strengths: string[];
  weakAreas: string[];
  recommendations: string[];
  categoryBreakdown?: Record<string, number>;
  questionsFeedback?: IQuestionFeedbackItem[];
  createdAt: Date;
  updatedAt: Date;
}

const InterviewFeedbackSchema = new Schema<IInterviewFeedbackDoc>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    summary: { type: String, required: true },
    overallScore: { type: Number, required: true },
    hiringDecision: {
      type: String,
      enum: Object.values(HiringDecision),
      default: HiringDecision.LEAN_HIRE,
    },
    strengths: [{ type: String }],
    weakAreas: [{ type: String }],
    recommendations: [{ type: String }],
    categoryBreakdown: { type: Map, of: Number },
    questionsFeedback: [
      {
        questionId: { type: String },
        order: { type: Number },
        questionText: { type: String },
        category: { type: String },
        difficulty: { type: String },
        userResponse: { type: String },
        score: { type: Number },
        feedback: { type: String },
        expectedCriteria: [{ type: String }],
        missedCriteria: [{ type: String }],
        strengths: [{ type: String }],
        technicalAccuracy: { type: Number },
        communicationClarity: { type: Number },
      },
    ],
  },
  {
    timestamps: true,
  },
);

export const InterviewFeedbackModel = mongoose.model<IInterviewFeedbackDoc>(
  'InterviewFeedback',
  InterviewFeedbackSchema,
);
