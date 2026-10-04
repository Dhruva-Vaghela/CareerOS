import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewResponseEvaluation {
  score: number;
  feedback: string;
  strengths?: string[];
  improvements?: string[];
  technicalAccuracy?: number;
  communicationClarity?: number;
  alignmentWithRole?: number;
}

export interface IInterviewResponseDoc extends Document {
  sessionId: string;
  questionId: string;
  userId: string;
  responseTextOrAudioRef: string;
  audioRef?: string;
  transcript?: string;
  evaluation?: IInterviewResponseEvaluation;
  createdAt: Date;
  updatedAt: Date;
}

const InterviewResponseSchema = new Schema<IInterviewResponseDoc>(
  {
    sessionId: { type: String, required: true, index: true },
    questionId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    responseTextOrAudioRef: { type: String, required: true },
    audioRef: { type: String },
    transcript: { type: String },
    evaluation: {
      score: { type: Number },
      feedback: { type: String },
      strengths: [{ type: String }],
      improvements: [{ type: String }],
      technicalAccuracy: { type: Number },
      communicationClarity: { type: Number },
      alignmentWithRole: { type: Number },
    },
  },
  {
    timestamps: true,
  },
);

InterviewResponseSchema.index({ sessionId: 1, questionId: 1 }, { unique: true });

export const InterviewResponseModel = mongoose.model<IInterviewResponseDoc>(
  'InterviewResponse',
  InterviewResponseSchema,
);
