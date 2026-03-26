import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// ACHIEVEMENT SCHEMA
// ============================================
export type AchievementType = 'funding' | 'product' | 'growth' | 'milestone';
export type AchievementVisibility = 'public' | 'private';

export interface IAchievement extends Document {
    startupId: mongoose.Types.ObjectId;
    title: string;
    description: string;
    type: AchievementType;
    visibility: AchievementVisibility;
    createdAt: Date;
    updatedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>(
    {
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        title: { type: String, required: true, trim: true, maxlength: 200 },
        description: { type: String, required: true, maxlength: 2000 },
        type: { type: String, enum: ['funding', 'product', 'growth', 'milestone'], required: true },
        visibility: { type: String, enum: ['public', 'private'], default: 'public' },
    },
    { timestamps: true }
);

AchievementSchema.index({ startupId: 1 });
AchievementSchema.index({ type: 1 });

export const Achievement = mongoose.models.Achievement || mongoose.model<IAchievement>('Achievement', AchievementSchema);
