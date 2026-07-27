import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemCheckDocument extends Document {
  _id: mongoose.Types.ObjectId;
  status: string;
  checkedAt: Date;
}

const systemCheckSchema = new Schema<ISystemCheckDocument>(
  {
    status: { type: String, required: true },
    checkedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

systemCheckSchema.virtual('id').get(function (this: ISystemCheckDocument) {
  return this._id.toHexString();
});

export const SystemCheckModel =
  mongoose.models.SystemCheck || mongoose.model<ISystemCheckDocument>('SystemCheck', systemCheckSchema, 'system_checks');

export type SystemCheck = {
  id: string;
  status: string;
  checkedAt: Date;
};
