import mongoose, { Schema, Document } from 'mongoose';
import { NodeType } from '@careeros/shared-types';

export interface ITopicDoc extends Document {
  moduleId: mongoose.Types.ObjectId;
  roadmapId: mongoose.Types.ObjectId;
  order: number;
  title: string;
  description?: string;
  type: NodeType;
  createdAt: Date;
  updatedAt: Date;
}

const TopicSchema = new Schema<ITopicDoc>(
  {
    moduleId: { type: Schema.Types.ObjectId, ref: 'RoadmapModule', required: true, index: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    type: {
      type: String,
      enum: Object.values(NodeType),
      default: NodeType.MANDATORY,
    },
  },
  {
    timestamps: true,
  },
);

export const TopicModel = mongoose.model<ITopicDoc>('RoadmapTopic', TopicSchema);
