import mongoose, { Schema, Document } from 'mongoose';

export interface IInterviewQuestionDoc extends Document {
  sessionId: string;
  order: number;
  questionText: string;
  category?: string;
  targetWeakArea?: string;
  difficulty: string;
  audioUrl?: string;
  rubricCriteria?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const InterviewQuestionSchema = new Schema<IInterviewQuestionDoc>(
  {
    sessionId: { type: String, required: true, index: true },
    order: { type: Number, required: true },
    questionText: { type: String, required: true },
    category: { type: String },
    targetWeakArea: { type: String },
    difficulty: { type: String, default: 'Medium' },
    audioUrl: { type: String },
    rubricCriteria: [{ type: String }],
  },
  {
    timestamps: true,
  },
);

InterviewQuestionSchema.index({ sessionId: 1, order: 1 }, { unique: true });

export const InterviewQuestionModel = mongoose.model<IInterviewQuestionDoc>(
  'InterviewQuestion',
  InterviewQuestionSchema,
);
