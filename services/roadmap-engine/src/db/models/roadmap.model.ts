import mongoose, { Schema, Document } from 'mongoose';
import { RoadmapStatus } from '@careeros/shared-types';

export interface IRoadmapDoc extends Document {
  userId: string;
  goalId: string;
  targetRole: string;
  status: RoadmapStatus;
  version: number;
  modulesCount: number;
  totalItemsCount: number;
  completedItemsCount: number;
  generatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapSchema = new Schema<IRoadmapDoc>(
  {
    userId: { type: String, required: true, index: true },
    goalId: { type: String, required: true },
    targetRole: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(RoadmapStatus),
      default: RoadmapStatus.ACTIVE,
      index: true,
    },
    version: { type: Number, default: 1 },
    modulesCount: { type: Number, default: 0 },
    totalItemsCount: { type: Number, default: 0 },
    completedItemsCount: { type: Number, default: 0 },
    generatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

export const RoadmapModel = mongoose.model<IRoadmapDoc>('Roadmap', RoadmapSchema);
