import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// TEAM MEMBER SCHEMA
// ============================================
export type TeamMemberStatus = 'active' | 'inactive';

export interface ITeamMember extends Document {
    userId: mongoose.Types.ObjectId;
    startupId: mongoose.Types.ObjectId;
    role: string;
    skills: string[];
    equity: number;
    status: TeamMemberStatus;
    joinedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const TeamMemberSchema = new Schema<ITeamMember>(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        role: { type: String, default: '' },
        skills: [{ type: String }],
        equity: { type: Number, default: 0, min: 0, max: 100 },
        status: { type: String, enum: ['active', 'inactive'], default: 'active' },
        joinedAt: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

TeamMemberSchema.index({ startupId: 1 });
TeamMemberSchema.index({ userId: 1, startupId: 1 }, { unique: true });

export const TeamMember = mongoose.models.TeamMember || mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
