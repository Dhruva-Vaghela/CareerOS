import mongoose, { Schema, Document } from 'mongoose';
import { CurrentStatus, ExperienceLevel, AvailabilityTimeframe } from '@careeros/shared-types';

export interface IProfileDocument extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  fullName: string;
  profilePictureUrl?: string | null;
  country?: string | null;
  timezone?: string | null;
  preferredLanguage: string;
  college?: string | null;
  degree?: string | null;
  branch?: string | null;
  currentSemester?: number | null;
  graduationYear?: number | null;
  currentStatus?: CurrentStatus | null;
  targetRole: string;
  experienceLevel?: ExperienceLevel | null;
  availabilityHours?: number | null;
  availabilityTimeframe?: AvailabilityTimeframe | null;
  interests: string[];
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IProfileDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, default: '' },
    profilePictureUrl: { type: String, default: null },
    country: { type: String, default: null },
    timezone: { type: String, default: null },
    preferredLanguage: { type: String, required: true, default: 'en' },
    college: { type: String, default: null },
    degree: { type: String, default: null },
    branch: { type: String, default: null },
    currentSemester: { type: Number, default: null },
    graduationYear: { type: Number, default: null },
    currentStatus: { type: String, enum: Object.values(CurrentStatus), default: null },
    targetRole: { type: String, required: true },
    experienceLevel: { type: String, enum: Object.values(ExperienceLevel), default: null },
    availabilityHours: { type: Number, default: null },
    availabilityTimeframe: { type: String, enum: Object.values(AvailabilityTimeframe), default: null },
    interests: { type: [String], default: [] },
    profileCompleted: { type: Boolean, required: true, default: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

profileSchema.virtual('id').get(function (this: IProfileDocument) {
  return this._id.toHexString();
});

export const ProfileModel = mongoose.models.Profile || mongoose.model<IProfileDocument>('Profile', profileSchema);

export type ProfileRow = {
  userId: string;
  fullName: string;
  profilePictureUrl?: string | null;
  country?: string | null;
  timezone?: string | null;
  preferredLanguage: string;
  college?: string | null;
  degree?: string | null;
  branch?: string | null;
  currentSemester?: number | null;
  graduationYear?: number | null;
  currentStatus?: CurrentStatus | null;
  targetRole: string;
  experienceLevel?: ExperienceLevel | null;
  availabilityHours?: number | null;
  availabilityTimeframe?: AvailabilityTimeframe | null;
  interests: string[];
  profileCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};
