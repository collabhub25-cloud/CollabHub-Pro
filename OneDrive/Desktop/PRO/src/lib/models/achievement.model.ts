import mongoose, { Document, Schema } from 'mongoose';

export interface IAchievement extends Document {
  userId?: mongoose.Types.ObjectId;
  startupId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: string;
  organization?: string;
  date?: Date;
  proofLink?: string;
  visibility?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', index: true },
    title: { type: String, required: true },
    description: { type: String },
    type: { 
      type: String, 
      default: 'other'
    },
    organization: { type: String },
    date: { type: Date },
    proofLink: { type: String },
    visibility: { type: String, default: 'public' },
  },
  { timestamps: true }
);

export default mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
