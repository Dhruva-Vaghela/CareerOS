import mongoose, { Schema, Document } from 'mongoose';
import { NodeType } from '@careeros/shared-types';

export interface IModuleDoc extends Document {
  roadmapId: mongoose.Types.ObjectId;
  order: number;
  title: string;
  description?: string;
  type: NodeType;
  estimatedHours: number;
  createdAt: Date;
  updatedAt: Date;
}

const ModuleSchema = new Schema<IModuleDoc>(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: Object.values(NodeType),
      default: NodeType.MANDATORY,
    },
    estimatedHours: { type: Number, default: 10 },
  },
  {
    timestamps: true,
  },
);

export const ModuleModel = mongoose.model<IModuleDoc>('RoadmapModule', ModuleSchema);
