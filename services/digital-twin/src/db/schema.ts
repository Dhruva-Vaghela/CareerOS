import mongoose, { Schema, Document } from 'mongoose';
import {
  TwinNodeType,
  VerificationStatus,
  ConfidenceLevel,
} from '@careeros/shared-types';

export interface IDigitalTwinDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITwinNodeDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  twinId: string;
  nodeType: TwinNodeType;
  source: string;
  verificationStatus: VerificationStatus;
  confidenceScore: ConfidenceLevel;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITwinRelationshipDocument extends Document {
  _id: mongoose.Types.ObjectId;
  twinId: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipType: string;
  createdAt: Date;
}

export interface ITwinSnapshotDocument extends Document {
  _id: mongoose.Types.ObjectId;
  twinId: string;
  userId: string;
  snapshotData: Record<string, unknown>;
  createdAt: Date;
}

const digitalTwinSchema = new Schema<IDigitalTwinDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    status: { type: String, required: true, default: 'ACTIVE' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

digitalTwinSchema.virtual('id').get(function (this: IDigitalTwinDocument) {
  return this._id.toHexString();
});

const twinNodeSchema = new Schema<ITwinNodeDocument>(
  {
    userId: { type: String, required: true, index: true },
    twinId: { type: String, required: true, index: true },
    nodeType: {
      type: String,
      enum: Object.values(TwinNodeType),
      required: true,
      index: true,
    },
    source: { type: String, required: true },
    verificationStatus: {
      type: String,
      enum: Object.values(VerificationStatus),
      required: true,
      default: VerificationStatus.UNVERIFIED,
    },
    confidenceScore: {
      type: String,
      enum: Object.values(ConfidenceLevel),
      required: true,
      default: ConfidenceLevel.MEDIUM,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

twinNodeSchema.virtual('id').get(function (this: ITwinNodeDocument) {
  return this._id.toHexString();
});

twinNodeSchema.index({ twinId: 1, nodeType: 1 });

const twinRelationshipSchema = new Schema<ITwinRelationshipDocument>(
  {
    twinId: { type: String, required: true, index: true },
    fromNodeId: { type: String, required: true, index: true },
    toNodeId: { type: String, required: true, index: true },
    relationshipType: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

const twinSnapshotSchema = new Schema<ITwinSnapshotDocument>(
  {
    twinId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    snapshotData: { type: Schema.Types.Mixed, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const DigitalTwinModel =
  mongoose.models.DigitalTwin || mongoose.model<IDigitalTwinDocument>('DigitalTwin', digitalTwinSchema, 'DigitalTwins');

export const TwinNodeModel =
  mongoose.models.TwinNode || mongoose.model<ITwinNodeDocument>('TwinNode', twinNodeSchema, 'TwinNodes');

export const TwinRelationshipModel =
  mongoose.models.TwinRelationship ||
  mongoose.model<ITwinRelationshipDocument>('TwinRelationship', twinRelationshipSchema, 'TwinRelationships');

export const TwinSnapshotModel =
  mongoose.models.TwinSnapshot ||
  mongoose.model<ITwinSnapshotDocument>('TwinSnapshot', twinSnapshotSchema, 'TwinSnapshots');

export type DigitalTwinRow = {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

export type TwinNodeRow = {
  id: string;
  userId: string;
  twinId: string;
  nodeType: TwinNodeType;
  source: string;
  verificationStatus: VerificationStatus;
  confidenceScore: ConfidenceLevel;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};
