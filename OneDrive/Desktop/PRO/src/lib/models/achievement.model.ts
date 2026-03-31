import mongoose, { Document, Schema } from 'mongoose';

export interface IAchievement extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

const AchievementSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
