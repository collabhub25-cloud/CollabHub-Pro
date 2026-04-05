import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// ALLIANCE SCHEMA
// ============================================
export interface IAlliance extends Document {
    requesterId: mongoose.Types.ObjectId;
    receiverId: mongoose.Types.ObjectId;
    startupId?: mongoose.Types.ObjectId;
    status: 'pending' | 'accepted' | 'rejected';
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AllianceSchema = new Schema<IAlliance>(
    {
        requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        receiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup' },
        status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
        message: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

AllianceSchema.index({ requesterId: 1, receiverId: 1 }, { unique: true });
export const Alliance = mongoose.models.Alliance || mongoose.model<IAlliance>('Alliance', AllianceSchema);

// ============================================
// FAVORITE SCHEMA
// ============================================
export interface IFavorite extends Document {
    userId: mongoose.Types.ObjectId;
    targetId: mongoose.Types.ObjectId; // E.g Startup, User
    targetType: 'startup' | 'user' | 'job';
    createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        targetId: { type: Schema.Types.ObjectId, required: true },
        targetType: { type: String, enum: ['startup', 'user', 'job'], required: true },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

FavoriteSchema.index({ userId: 1, targetId: 1, targetType: 1 }, { unique: true });
export const Favorite = mongoose.models.Favorite || mongoose.model<IFavorite>('Favorite', FavoriteSchema);

// ============================================
// ACCESS REQUEST SCHEMA
// ============================================

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface IAccessRequest extends Document {
    startupId: mongoose.Types.ObjectId;
    investorId: mongoose.Types.ObjectId;
    founderId: mongoose.Types.ObjectId;
    status: AccessRequestStatus;
    message?: string;
    createdAt: Date;
    updatedAt: Date;
}

const AccessRequestSchema = new Schema<IAccessRequest>(
    {
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        investorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        founderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        status: { type: String, enum: ['pending', 'approved', 'rejected', 'revoked'], default: 'pending' },
        message: { type: String, maxlength: 500 },
    },
    { timestamps: true }
);

AccessRequestSchema.index({ startupId: 1, investorId: 1 });
AccessRequestSchema.index({ founderId: 1 });
AccessRequestSchema.index({ status: 1 });

// Force recompile during development so HMR picks up the new schema
if (mongoose.models.AccessRequest) {
    delete mongoose.models.AccessRequest;
}
export const AccessRequest = mongoose.models.AccessRequest || mongoose.model<IAccessRequest>('AccessRequest', AccessRequestSchema);

// NOTE: SkillTest + UserTestResult schemas have been moved to skill-test.model.ts for richer structure

// ALLIANCE EXPORTS (Placeholder to maintain types across the app)
export type AllianceStatus = 'pending' | 'accepted' | 'rejected';
