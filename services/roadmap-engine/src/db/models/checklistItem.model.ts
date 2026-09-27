import mongoose, { Schema, Document } from 'mongoose';

export interface IChecklistItemDoc extends Document {
  subtopicId: mongoose.Types.ObjectId;
  topicId: mongoose.Types.ObjectId;
  moduleId: mongoose.Types.ObjectId;
  roadmapId: mongoose.Types.ObjectId;
  userId: string;
  order: number;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: Date;
  resourceRef?: {
    title: string;
    url: string;
    type?: string;
  };
  userNote?: string;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChecklistItemSchema = new Schema<IChecklistItemDoc>(
  {
    subtopicId: { type: Schema.Types.ObjectId, ref: 'RoadmapSubtopic', required: true, index: true },
    topicId: { type: Schema.Types.ObjectId, ref: 'RoadmapTopic', required: true, index: true },
    moduleId: { type: Schema.Types.ObjectId, ref: 'RoadmapModule', required: true, index: true },
    roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true, index: true },
    userId: { type: String, required: true, index: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String },
    completed: { type: Boolean, default: false, index: true },
    completedAt: { type: Date },
    resourceRef: {
      title: { type: String },
      url: { type: String },
      type: { type: String },
    },
    userNote: { type: String },
    deadline: { type: Date },
  },
  {
    timestamps: true,
  },
);

export const ChecklistItemModel = mongoose.model<IChecklistItemDoc>('RoadmapChecklistItem', ChecklistItemSchema);
