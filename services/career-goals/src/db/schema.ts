import mongoose, { Schema, Document } from 'mongoose';
import { CareerGoalStatus } from '@careeros/shared-types';

export interface ICareerGoalDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  targetRole: string;
  targetCompanies: string[];
  timeline: string;
  customTimeline?: string | null;
  status: CareerGoalStatus;
  createdAt: Date;
  updatedAt: Date;
}

const careerGoalSchema = new Schema<ICareerGoalDocument>(
  {
    userId: { type: String, required: true, index: true },
    targetRole: { type: String, required: true },
    targetCompanies: { type: [String], default: [] },
    timeline: { type: String, required: true },
    customTimeline: { type: String, default: null },
    status: {
      type: String,
      enum: Object.values(CareerGoalStatus),
      required: true,
      default: CareerGoalStatus.ACTIVE,
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

careerGoalSchema.virtual('id').get(function (this: ICareerGoalDocument) {
  return this._id.toHexString();
});

// Compound index for fast active goal lookups per user
careerGoalSchema.index({ userId: 1, status: 1 });

export const CareerGoalModel =
  mongoose.models.CareerGoal || mongoose.model<ICareerGoalDocument>('CareerGoal', careerGoalSchema);

export type CareerGoalRow = {
  id: string;
  userId: string;
  targetRole: string;
  targetCompanies: string[];
  timeline: string;
  customTimeline?: string | null;
  status: CareerGoalStatus;
  createdAt: Date;
  updatedAt: Date;
};
