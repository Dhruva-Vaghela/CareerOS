import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanyInterviewProfileDoc extends Document {
  companyName: string;
  jobRole: string;
  experienceLevel: string;
  roundType: string;
  referencePatternNotes?: string;
  competenciesTested: string[];
  defaultQuestionsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CompanyInterviewProfileSchema = new Schema<ICompanyInterviewProfileDoc>(
  {
    companyName: { type: String, required: true, index: true },
    jobRole: { type: String, required: true, index: true },
    experienceLevel: { type: String, required: true },
    roundType: { type: String, required: true, index: true },
    referencePatternNotes: { type: String },
    competenciesTested: [{ type: String }],
    defaultQuestionsCount: { type: Number, default: 5 },
  },
  {
    timestamps: true,
  },
);

CompanyInterviewProfileSchema.index(
  { companyName: 1, jobRole: 1, roundType: 1, experienceLevel: 1 },
  { unique: true },
);

export const CompanyInterviewProfileModel = mongoose.model<ICompanyInterviewProfileDoc>(
  'CompanyInterviewProfile',
  CompanyInterviewProfileSchema,
);
