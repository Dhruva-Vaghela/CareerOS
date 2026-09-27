import mongoose, { Schema, Document } from 'mongoose';
import { NodeType } from '@careeros/shared-types';

export interface ISubtopicDoc extends Document {
  topicId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  roadmapId: mongoose.Types.ObjectId;
  order: number;
  title: string;
  type: NodeType;
  createdAt: Date;
  updatedAt: Date;
}

const SubtopicSchema = new Schema<ISubtopicDoc>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: 'RoadmapTopic', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'RoadmapModule', required: true, index: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
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

export const SubtopicModel = mongoose.model<ISubtopicDoc>('RoadmapSubtopic', SubtopicSchema);
