import mongoose, { Schema } from 'mongoose';
import type { Assessment, AssessmentAttempt } from './types.js';

const questionSchema = new Schema({
  id: { type: String, required: true },
  assessmentId: { type: String, required: true },
  question: { type: String, required: true },
  type: { type: String, enum: ['MCQ'], default: 'MCQ', required: true },
  options: { type: [String], required: true },
  correctAnswer: { type: String, required: true },
  explanation: { type: String, required: true },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], required: true },
  marks: { type: Number, required: true },
  skillId: { type: String, required: true },
  skillName: { type: String, required: true },
  topicId: { type: String, required: true },
  topicName: { type: String, required: true },
  order: { type: Number, required: true },
}, { _id: false });

const assessmentSchema = new Schema({
  _id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  roadmapId: { type: String, required: true, index: true },
  roadmapVersion: { type: Number, required: true },
  moduleId: { type: String, required: true, index: true },
  moduleTitle: { type: String, required: true },
  topicId: { type: String, required: true },
  topicTitle: { type: String, required: true },
  type: { type: String, enum: ['TOPIC_QUIZ', 'MODULE_ASSESSMENT'], required: true },
  difficulty: { type: String, enum: ['EASY', 'MEDIUM', 'HARD'], required: true },
  duration: { type: Number, required: true },
  totalQuestions: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  questions: { type: [questionSchema], required: true },
}, { timestamps: true });

assessmentSchema.index({ userId: 1, roadmapId: 1, topicId: 1, createdAt: -1 });

const questionResultSchema = new Schema({
  questionId: { type: String, required: true },
  topicId: { type: String, required: true },
  topicName: { type: String, required: true },
  skillId: { type: String, required: true },
  skillName: { type: String, required: true },
  isCorrect: { type: Boolean, required: true },
  marksAwarded: { type: Number, required: true },
  selectedAnswer: { type: Schema.Types.Mixed, default: null },
}, { _id: false });

const performanceSchema = new Schema({
  skillId: String,
  skillName: String,
  topicId: String,
  topicName: String,
  questionsAttempted: { type: Number, required: true },
  correctAnswers: { type: Number, required: true },
  incorrectAnswers: { type: Number, required: true },
  unansweredQuestions: { type: Number, required: true },
  score: { type: Number, required: true },
  percentage: { type: Number, required: true },
}, { _id: false });

const attemptSchema = new Schema({
  _id: { type: String, required: true },
  assessmentId: { type: String, required: true, index: true },
  studentId: { type: String, required: true, index: true },
  startedAt: { type: Date, required: true },
  submittedAt: Date,
  status: { type: String, enum: ['IN_PROGRESS', 'SUBMITTED', 'ABANDONED'], required: true },
  attemptNumber: { type: Number, required: true },
  score: Number,
  percentage: Number,
  totalMarks: Number,
  obtainedMarks: Number,
  correctAnswers: Number,
  incorrectAnswers: Number,
  unansweredQuestions: Number,
  answers: Schema.Types.Mixed,
  questionResults: { type: [questionResultSchema], default: [] },
  topicPerformance: { type: [performanceSchema], default: [] },
  skillPerformance: { type: [performanceSchema], default: [] },
}, { timestamps: true });

export const AssessmentModel = (mongoose.models.Assessment as mongoose.Model<Assessment> | undefined)
  ?? mongoose.model<Assessment>('Assessment', assessmentSchema);
export const AssessmentAttemptModel = (mongoose.models.AssessmentAttempt as mongoose.Model<AssessmentAttempt> | undefined)
  ?? mongoose.model<AssessmentAttempt>('AssessmentAttempt', attemptSchema);