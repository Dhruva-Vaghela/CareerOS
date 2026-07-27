import mongoose, { Schema, Document } from 'mongoose';
import { UserStatus } from '@careeros/shared-types';

export interface IUserDocument extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  authProvider: string;
  status: UserStatus;
  createdAt: Date;
}

export interface ISessionDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  refreshTokenHash: string;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    authProvider: { type: String, required: true, default: 'LOCAL' },
    status: { type: String, enum: Object.values(UserStatus), required: true, default: UserStatus.ACTIVE },
    createdAt: { type: Date, default: Date.now, required: true },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual id property
userSchema.virtual('id').get(function (this: IUserDocument) {
  return this._id.toHexString();
});

const sessionSchema = new Schema<ISessionDocument>(
  {
    userId: { type: String, required: true, index: true },
    issuedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index for automatic cleanup
    refreshTokenHash: { type: String, required: true, index: true },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

sessionSchema.virtual('id').get(function (this: ISessionDocument) {
  return this._id.toHexString();
});

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', userSchema);
export const SessionModel = mongoose.models.Session || mongoose.model<ISessionDocument>('Session', sessionSchema);

export type UserRow = {
  id: string;
  email: string;
  passwordHash: string;
  authProvider: string;
  status: UserStatus;
  createdAt: Date;
};

export type SessionRow = {
  id: string;
  userId: string;
  issuedAt: Date;
  expiresAt: Date;
  refreshTokenHash: string;
};
