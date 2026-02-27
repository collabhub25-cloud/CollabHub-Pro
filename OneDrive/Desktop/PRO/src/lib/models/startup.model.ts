import mongoose, { Schema, Document } from 'mongoose';

// ============================================
// STARTUP SCHEMA
import { FundingStage } from './funding.model';

export type StartupStage = 'idea' | 'validation' | 'mvp' | 'growth' | 'scaling';

export interface IRoleNeeded {
    title: string;
    description: string;
    skills: string[];
    compensationType: 'equity' | 'cash' | 'mixed';
    equityPercent?: number;
    cashAmount?: number;
    status: 'open' | 'filled' | 'closed';
}

const RoleNeededSchema = new Schema<IRoleNeeded>({
    title: { type: String, required: true },
    description: { type: String, required: true },
    skills: [{ type: String }],
    compensationType: { type: String, enum: ['equity', 'cash', 'mixed'], required: true },
    equityPercent: { type: Number, min: 0, max: 100 },
    cashAmount: { type: Number },
    status: { type: String, enum: ['open', 'filled', 'closed'], default: 'open' },
});

export interface IStartup extends Document {
    founderId: mongoose.Types.ObjectId;
    name: string;
    vision: string;
    description: string;
    stage: StartupStage;
    industry: string;
    team: mongoose.Types.ObjectId[];
    rolesNeeded: IRoleNeeded[];
    fundingStage: FundingStage;
    fundingAmount?: number;
    revenue?: number;
    trustScore: number;
    logo?: string;
    website?: string;
    pitchDeck?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const StartupSchema = new Schema<IStartup>(
    {
        founderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true, trim: true },
        vision: { type: String, required: true, maxlength: 500 },
        description: { type: String, required: true, maxlength: 2000 },
        stage: { type: String, enum: ['idea', 'validation', 'mvp', 'growth', 'scaling'], required: true },
        industry: { type: String, required: true },
        team: [{ type: Schema.Types.ObjectId, ref: 'User' }],
        rolesNeeded: [RoleNeededSchema],
        fundingStage: { type: String, enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'ipo'], required: true },
        fundingAmount: { type: Number },
        revenue: { type: Number },
        trustScore: { type: Number, default: 50, min: 0, max: 100 },
        logo: { type: String },
        website: { type: String },
        pitchDeck: { type: String },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

StartupSchema.index({ founderId: 1 });
StartupSchema.index({ industry: 1 });
StartupSchema.index({ fundingStage: 1 });
StartupSchema.index({ trustScore: -1 });
StartupSchema.index({ stage: 1 });

export const Startup = mongoose.models.Startup || mongoose.model<IStartup>('Startup', StartupSchema);
