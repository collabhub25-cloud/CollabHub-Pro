import mongoose, { Schema, Document } from 'mongoose';

export type PostType = 'milestone' | 'funding' | 'product_release' | 'hiring' | 'general';

export interface IJourneyPost extends Document {
  startupId: mongoose.Types.ObjectId;
  title?: string;
  description: string;
  mediaUrls: string[];
  postType: PostType;
  tags: string[];
  likes: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const JourneyPostSchema = new Schema<IJourneyPost>(
  {
    startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true, index: true },
    title: { type: String, maxlength: 200 },
    description: { type: String, required: true, maxlength: 5000 },
    mediaUrls: [{ type: String }],
    postType: { type: String, enum: ['milestone', 'funding', 'product_release', 'hiring', 'general'], default: 'general' },
    tags: [{ type: String }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

JourneyPostSchema.index({ startupId: 1, createdAt: -1 });

export const JourneyPost = mongoose.models.JourneyPost || mongoose.model<IJourneyPost>('JourneyPost', JourneyPostSchema);
