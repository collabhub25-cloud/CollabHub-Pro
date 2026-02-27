import mongoose, { Schema, Document } from 'mongoose';
import { FundingStage, RoundStatus } from './funding.model';

export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'accepted' | 'rejected';

export interface IApplication extends Document {
    startupId: mongoose.Types.ObjectId;
    talentId: mongoose.Types.ObjectId;
    roleId: string;
    status: ApplicationStatus;
    coverLetter: string;
    resumeUrl?: string;
    interviewNotes?: string;
    proposedEquity?: number;
    proposedCash?: number;
    createdAt: Date;
    updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
    {
        startupId: { type: Schema.Types.ObjectId, ref: 'Startup', required: true },
        talentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        roleId: { type: String, required: true },
        status: { type: String, enum: ['pending', 'reviewed', 'shortlisted', 'accepted', 'rejected'], default: 'pending' },
        coverLetter: { type: String, required: true, maxlength: 2000 },
        resumeUrl: { type: String },
        interviewNotes: { type: String },
        proposedEquity: { type: Number },
        proposedCash: { type: Number },
    },
    { timestamps: true }
);

ApplicationSchema.index({ startupId: 1 });
ApplicationSchema.index({ talentId: 1 });
ApplicationSchema.index({ status: 1 });

export const Application = mongoose.models.Application || mongoose.model<IApplication>('Application', ApplicationSchema);
