import mongoose, { Schema, Document } from 'mongoose';

export interface IDependencyLinkDoc extends Document {
  roadmapId: mongoose.Types.ObjectId;
  fromNodeId: string;
  toNodeId: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

const DependencyLinkSchema = new Schema<IDependencyLinkDoc>(
  {
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true, index: true },
    fromNodeId: { type: String, required: true },
    toNodeId: { type: String, required: true },
    type: { type: String, default: 'PREREQUISITE' },
  },
  {
    timestamps: true,
  },
);

export const DependencyLinkModel = mongoose.model<IDependencyLinkDoc>('RoadmapDependencyLink', DependencyLinkSchema);
